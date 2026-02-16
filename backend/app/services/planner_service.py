from datetime import datetime, timedelta, timezone
import json
import re
from typing import Any
from pymongo.database import Database
from app.services.ai_service import call_openai
from app.utils.mongo import parse_object_id, serialize_id

class PlannerService:
    @staticmethod
    def generate_plan(db: Database, student_id: str, availability_hours: float, target_date: datetime) -> dict[str, Any]:
        """
        Generates a personalized study plan using AI.
        """
        print(f"DEBUG: PlannerService.generate_plan using database: {db.name}")
        student_oid = parse_object_id(student_id, "student_id")
        student = db.users.find_one({"_id": student_oid})
        if not student:
            student = {}
        # We now ignore the student's specific subject specialization for the plan itself,
        # ensuring they get a balanced diet of all 3 subjects.
        year = student.get("year") or "12th"
        
        now = datetime.now(timezone.utc)
        days_left = (target_date - now).days
        if days_left <= 0:
            days_left = 30 # Default to 1 month if target date is passed or too close
            
        prompt = (
            f"Generate a highly detailed JEE study plan for a {year} student.\n"
            f"Daily Availability: {availability_hours} hours.\n"
            f"Timeline: {days_left} days remaining until exam.\n"
            "Goal: Create a balanced daily schedule covering Physics, Chemistry, and Mathematics.\n"
            "Structure:\n"
            "- Schedule at least one task for EVERY DAY from Monday through Saturday (6 days a week). DO NOT SKIP ANY DAYS.\n"
            "- Sunday must be a REST DAY (no tasks).\n"
            "- Mix subjects daily (e.g., Physics + Math on Day 1, Chemistry + Physics on Day 2).\n"
            "- Include 'Revision' slots and 'Mock Test' slots periodically.\n"
            "- Ensure the total duration per day roughly matches availability.\n"
            "- CRITICAL: Break down large chapters into specific daily tasks.\n\n"
            "Return a JSON object with a 'tasks' key containing a list of tasks. Each task must have:\n"
            "- 'title': Chapter name\n"
            "- 'subject': 'Physics', 'Chemistry', or 'Mathematics'\n"
            "- 'topic': Specific sub-topic or activity (e.g., 'Solve 30 MCQs on Coulomb Law')\n"
            "- 'subtopics': A list of 3-5 SPECIFIC key concepts or problem types to cover (e.g., ['Electric Field Lines', 'Gauss Law Applications', 'Dipole moment']). Do NOT leave this empty.\n"
            "- 'duration_minutes': Integer estimated time\n"
            "- 'due_date': ISO 8601 YYYY-MM-DD string\n"
            "- 'type': 'study', 'revision', or 'mock_test'\n"
        )
        
        try:
            raw_res = call_openai(prompt, response_mime_type="application/json")
            
            # Extract JSON from potential markdown or garbage
            json_match = re.search(r"(\{.*\}|\[.*\])", raw_res, re.DOTALL)
            parsed = {}
            if json_match:
                content = json_match.group(1)
                try:
                    parsed = json.loads(content)
                except json.JSONDecodeError:
                    # Fallback: simple cleanup of common AI JSON mistakes
                    # 1. Replace single quotes with double quotes
                    cleaned = content.replace("'", '"')
                    # 2. Remove trailing commas before closing braces/brackets
                    cleaned = re.sub(r",\s*([\]}])", r"\1", cleaned)
                    try:
                        parsed = json.loads(cleaned)
                    except json.JSONDecodeError:
                        # 3. Last ditch: try to fix unquoted keys (rare but happens)
                        cleaned = re.sub(r"(\{|,)\s*([a-zA-Z0-9_]+)\s*:", r'\1 "\2":', cleaned)
                        try:
                            parsed = json.loads(cleaned)
                        except json.JSONDecodeError:
                            parsed = {}
            
            tasks = []
            if isinstance(parsed, list):
                tasks = parsed
            elif isinstance(parsed, dict):
                tasks = parsed.get("tasks") or parsed.get("items") or []

            # If AI failed to give us tasks, use a predefined fallback list
            if not tasks:
                print(f"DEBUG: AI response empty or invalid for student {student_id}. Using fallback topics.")
                tasks = PlannerService._get_fallback_tasks(days_left)
            
            # Ensure each task has an ID and subject for frontend tracking
            import uuid
            for task in tasks:
                if isinstance(task, dict):
                    if "id" not in task:
                        task["id"] = str(uuid.uuid4())
                    if "subject" not in task:
                        # Fallback subject if AI forgot it
                        task["subject"] = "Physics"
                    if "status" not in task:
                        task["status"] = "pending"
                    if "quiz_status" not in task:
                        task["quiz_status"] = "not_started"
                    
                    # ENFORCE SUBTOPICS
                    if "subtopics" not in task or not task["subtopics"]:
                        # If AI failed to generate subtopics, use defaults based on subject
                        subj = str(task.get("subject", "General"))
                        if "Physics" in subj:
                            task["subtopics"] = ["Concepts & Definitions", "Formula Derivations", "Practice Problems"]
                        elif "Chemistry" in subj:
                            task["subtopics"] = ["Key Concepts", "Reaction Mechanisms", "NCERT Exercises"]
                        elif "Math" in subj:
                            task["subtopics"] = ["Theorems & Proofs", "Solved Examples", "Problem Sets"]
                        else:
                            task["subtopics"] = ["Study Core Concepts", "Review Notes", "Practice Questions"]
                            
                    if "completed_subtopics" not in task:
                        task["completed_subtopics"] = []
            
            debug_log_path = "/tmp/planner_debug.log"
            try:
                with open(debug_log_path, "a") as f:
                    f.write(f"\nDEBUG: Tasks saved to DB: {json.dumps(tasks[:1], indent=2)}\n")
            except Exception as e:
                print(f"Failed to write debug log: {e}")

            plan_doc = {
                "student_id": str(student_id),
                "availability_hours": availability_hours,
                "target_exam_date": target_date,
                "tasks": tasks,
                "created_at": now,
                "updated_at": now
            }
            
            res_update = db.study_plans.update_one(
                {"student_id": str(student_id)},
                {"$set": plan_doc},
                upsert=True
            )
            print(f"DEBUG: Saved doc to study_plans. Matched: {res_update.matched_count}, Upserted ID: {res_update.upserted_id}")
            
            # Ensure it has an ID for Pydantic
            res = serialize_id(plan_doc)
            print(f"DEBUG: PlannerService returning success res with keys: {list(res.keys())}")
            return res
        except Exception as e:
            print(f"PLANNER ERROR: {str(e)}")
            # Return a minimal valid plan doc to avoid 500
            # SAVE FALLBACK TO DB SO COLLECTION EXISTS
            fallback_tasks = PlannerService._get_fallback_tasks(30)
            minimal_doc = {
                "student_id": str(student_id),
                "availability_hours": availability_hours,
                "target_exam_date": target_date if isinstance(target_date, datetime) else datetime.now(timezone.utc),
                "tasks": fallback_tasks,
                "created_at": now,
                "updated_at": now
            }
            db.study_plans.update_one(
                {"student_id": str(student_id)},
                {"$set": minimal_doc},
                upsert=True
            )
            print(f"DEBUG: Saved robust fallback to study_plans for student {student_id}")
            res = serialize_id(minimal_doc)
            return res

    @staticmethod
    def get_plan(db: Database, student_id: str) -> dict[str, Any] | None:
        doc = db.study_plans.find_one({"student_id": str(student_id)})
        return serialize_id(doc) if doc else None

    @staticmethod
    def mark_task_complete(db: Database, student_id: str, task_id: str) -> bool:
        """
        Marks a task as completed. 
        Note: The requirement is that a quiz must be passed. 
        The caller (API) should verify quiz status before calling this, 
        OR we can enforce it here. 
        For now, we will enforce it here: if the quiz is not passed, deny completion.
        """
        plan = db.study_plans.find_one({"student_id": str(student_id)})
        if not plan:
            return False
        
        tasks = plan.get("tasks", [])
        task_idx = next((i for i, t in enumerate(tasks) if t.get("id") == task_id), -1)
        
        if task_idx == -1:
            return False
            
        task = tasks[task_idx]
        # Allow marking as complete if it's not a study task (e.g., revision/mock) OR if quiz is passed
        # OR if it's lenient. But strict requirement says "once quiz is done it can be marked completed".
        if task.get("type", "study") == "study" and task.get("quiz_status") != "passed":
            # Start strict enforcement
            # raise HTTPException? Or just return False? 
            # Ideally return tuple (success, reason), but for backward compatibility, returns bool.
            # We'll allow it only if quiz is passed for study tasks.
            return False

        result = db.study_plans.update_one(
            {"student_id": str(student_id), "tasks.id": task_id},
            {"$set": {"tasks.$.status": "completed", "updated_at": datetime.now(timezone.utc)}}
        )
        return result.modified_count > 0

    @staticmethod
    def generate_task_quiz(db: Database, student_id: str, task_id: str) -> dict[str, Any]:
        """
        Generates a 5-question quiz for a specific study task.
        """
        from app.services.question_bank import build_question_set_with_source
        
        plan = db.study_plans.find_one({"student_id": str(student_id)})
        if not plan:
            raise ValueError("Study plan not found")
            
        tasks = plan.get("tasks", [])
        task = next((t for t in tasks if t.get("id") == task_id), None)
        if not task:
            raise ValueError("Task not found")
            
        subject = task.get("subject", "Physics")
        topic = task.get("title", "General") + " - " + task.get("topic", "")
        
        # Generate 5 questions (try AI, fallback to template)
        questions, source = build_question_set_with_source(
            subject=subject,
            total_questions=5,
            difficulty="Medium",
            topic=topic
        )
        
        # Save quiz attempt (in progress)
        now = datetime.now(timezone.utc)
        attempt_doc = {
            "student_id": str(student_id),
            "task_id": task_id,
            "subject": subject,
            "topic": topic,
            "questions": questions, # Stores full questions with answers for grading
            "score": 0,
            "status": "in_progress",
            "created_at": now,
            "updated_at": now
        }
        result = db.quiz_attempts.insert_one(attempt_doc)
        attempt_id = str(result.inserted_id)
        
        # Update task status to in_progress
        db.study_plans.update_one(
            {"student_id": str(student_id), "tasks.id": task_id},
            {"$set": {"tasks.$.quiz_status": "in_progress"}}
        )
        
        # Return sanitized questions (without correct answer indicator if client relies on it hidden)
        # But our FE usually expects 'questions' array. We can strip 'correct' field if needed.
        # For simplicity, we send it all; secure implementations should strip it. 
        # Let's strip 'correct' and 'explanation' for the client response.
        sanitized_questions = []
        for q in questions:
            q_copy = q.copy()
            q_copy.pop("correct", None)
            q_copy.pop("explanation", None)
            sanitized_questions.append(q_copy)
            
        return {
            "attempt_id": attempt_id,
            "questions": sanitized_questions
        }

    @staticmethod
    def submit_task_quiz(db: Database, student_id: str, attempt_id: str, answers: dict[str, int]) -> dict[str, Any]:
        """
        Submits answers for a quiz attempt, grades it, and updates task status if passed.
        answers: dict mapping question_id -> selected_option_index
        """
        attempt = db.quiz_attempts.find_one({"_id": parse_object_id(attempt_id, "attempt_id"), "student_id": str(student_id)})
        if not attempt:
            raise ValueError("Quiz attempt not found")
            
        questions = attempt.get("questions", [])
        total = len(questions)
        correct_count = 0
        
        for q in questions:
            qid = q.get("id")
            if qid in answers:
                if answers[qid] == q.get("correct"):
                    correct_count += 1
        
        score_percent = (correct_count / total * 100) if total > 0 else 0
        passed = True # User requested to proceed irrespective of score
        
        now = datetime.now(timezone.utc)
        status = "passed" if passed else "failed"
        
        db.quiz_attempts.update_one(
            {"_id": attempt["_id"]},
            {
                "$set": {
                    "score": score_percent,
                    "status": status,
                    "student_answers": answers,
                    "updated_at": now
                }
            }
        )
        
        task_id = attempt.get("task_id")
        if passed and task_id:
            # Update study plan task
            db.study_plans.update_one(
                {"student_id": str(student_id), "tasks.id": task_id},
                {
                    "$set": {
                        "tasks.$.quiz_status": "passed",
                        "tasks.$.status": "completed", # Auto complete task on pass
                        "updated_at": now
                    }
                }
            )
            
        return {
            "attempt_id": attempt_id,
            "score": score_percent,
            "passed": passed,
            "correct_count": correct_count,
            "total_questions": total
        }

    @staticmethod
    def assess_progress(db: Database, student_id: str) -> dict[str, Any]:
        """
        Assesses time availability and progress, providing a success assessment.
        """
        plan = db.study_plans.find_one({"student_id": str(student_id)})
        if not plan:
            return {"status": "no_plan", "message": "No study plan found."}
            
        tasks = plan.get("tasks", [])
        total_tasks = len(tasks)
        completed_tasks = len([t for t in tasks if t.get("status") == "completed"])
        
        now = datetime.now(timezone.utc)
        target_date = plan.get("target_exam_date")
        days_left = (target_date - now).days if target_date else 0
        
        # Calculate completion rate
        completion_percent = (completed_tasks / total_tasks * 100) if total_tasks else 0
        
        # AI-based assessment
        prompt = (
            f"Assess the study progress for a JEE student.\n"
            f"Completed: {completed_tasks}/{total_tasks} tasks.\n"
            f"Days left: {days_left}\n"
            f"Daily Availability: {plan.get('availability_hours')} hours\n\n"
            "Provide a short JSON assessment with:\n"
            "- 'status': 'on_track', 'behind', or 'ahead'\n"
            "- 'success_probability': percentage\n"
            "- 'recommendation': actionable advice to optimize for success."
        )
        
        try:
            raw_res = call_openai(prompt, response_mime_type="application/json")
            import json
            assessment = json.loads(raw_res)
            assessment["completion_percent"] = round(completion_percent, 1)
            return assessment
        except Exception:
            return {
                "status": "unknown",
                "success_probability": 0,
                "recommendation": "Maintain consistency to reach your goals."
            }
    @staticmethod
    def bulk_generate_plans(db: Database, jee_date: datetime) -> int:
        """
        Generates/Updates plans for all active students using the provided JEE date.
        """
        students = list(db.users.find({"role": "student", "status": "active"}))
        count = 0
        for student in students:
            student_id = str(student["_id"])
            availability = student.get("availability_hours", 4.0) # Default 4 hours
            # Reset/Generate plan
            PlannerService.generate_plan(db, student_id, availability, jee_date)
            count += 1
        return count

    @staticmethod
    def get_global_jee_date(db: Database) -> datetime | None:
        """
        Retrieves the global JEE exam date from settings.
        """
        config = db.settings.find_one({"key": "global_jee_date"})
        if config and "value" in config:
            val = config["value"]
            if isinstance(val, datetime):
                return val
            # Handle list/iso string if needed
            return datetime.fromisoformat(val.replace("Z", "+00:00")) if isinstance(val, str) else None
        return None

    @staticmethod
    def _get_fallback_tasks(days_left: int) -> list[dict[str, Any]]:
        """
        Provides a static scheduled list of high-weightage JEE topics across all subjects.
        """
        import uuid
        from datetime import datetime, timedelta, timezone
        
        # High weightage JEE topics (example for Physics/Chemistry/Maths)
        topics_map = {
            "Physics": [
                ("Electrostatics", "Electric Charges and Fields"),
                ("Current Electricity", "Ohm's Law and Circuits"),
                ("Magnetic Effects", "Moving Charges and Magnetism"),
                ("Optics", "Ray Optics and Optical Instruments"),
                ("Modern Physics", "Dual Nature of Radiation and Matter"),
                ("Thermodynamics", "Laws of Thermodynamics"),
                ("Kinematics", "Motion in a Straight Line"),
                ("Mechanics", "Laws of Motion")
            ],
            "Chemistry": [
                ("Organic Chemistry", "Hydrocarbons"),
                ("Physical Chemistry", "Chemical Kinetics"),
                ("Inorganic Chemistry", "P-Block Elements"),
                ("Physical Chemistry", "Thermodynamics"),
                ("Organic Chemistry", "Alcohols, Phenols and Ethers"),
                ("Coordination Compounds", "Bonding in Coordination Compounds"),
                ("Atomic Structure", "Quantum Mechanical Model"),
                ("Chemical Bonding", "Molecular Orbital Theory")
            ],
            "Mathematics": [
                ("Calculus", "Limits, Continuity and Differentiability"),
                ("Algebra", "Complex Numbers and Quadratic Equations"),
                ("Coordinate Geometry", "Circles"),
                ("Vectors & 3D", "Vector Algebra"),
                ("Calculus", "Integral Calculus"),
                ("Algebra", "Matrices and Determinants"),
                ("Trigonometry", "Trigonometric Functions"),
                ("Probability", "Conditional Probability")
            ]
        }
        
        tasks = []
        now = datetime.now(timezone.utc)
        
        # Interleave subjects: Day 1: P, Day 2: C, Day 3: M, Day 4: P...
        subjects = ["Physics", "Chemistry", "Mathematics"]
        
        # Flatten topics into a round-robin list
        all_topics = []
        max_len = max(len(v) for v in topics_map.values())
        
        for i in range(max_len):
            for subj in subjects:
                if i < len(topics_map[subj]):
                    all_topics.append((subj, topics_map[subj][i]))
        
        # Distribute over days_left
        current_date = now
        for i, (subj, (title, topic)) in enumerate(all_topics):
            # First task can start today if it's not Sunday
            if i > 0:
                current_date += timedelta(days=1)
            
            # Skip Sunday
            while current_date.weekday() == 6: # 6 is Sunday
                current_date += timedelta(days=1)

            due_date = current_date
            tasks.append({
                "id": str(uuid.uuid4()),
                "title": title,
                "subject": subj,
                "topic": topic,
                "subtopics": [f"Deep dive into {title}", f"Problem Solving: {topic}", f"{subj} Advanced Practice"],
                "completed_subtopics": [],
                "duration_minutes": 120,
                "due_date": due_date.isoformat(),
                "status": "pending",
                "quiz_status": "not_started",
                "type": "study"
            })
            
            # Add a revision task every 3 topics
            if (i + 1) % 3 == 0:
                tasks.append({
                    "id": str(uuid.uuid4()),
                    "title": f"Revision: {title}",
                    "subject": subj,
                    "topic": f"Quick review of {title} and previous topics",
                    "subtopics": ["Review Formulae", "Practice Problems"],
                    "completed_subtopics": [],
                    "duration_minutes": 60,
                    "due_date": due_date.isoformat(),
                    "status": "pending",
                    "quiz_status": "not_started",
                    "type": "revision"
                })

        return tasks

    @staticmethod
    def toggle_task_subtopic(db: Database, student_id: str, task_id: str, subtopic: str) -> dict[str, Any]:
        """
        Toggles the completion status of a subtopic in a task.
        """
        plan = db.study_plans.find_one({"student_id": str(student_id)})
        if not plan:
            raise ValueError("Study plan not found")
            
        tasks = plan.get("tasks", [])
        task_idx = next((i for i, t in enumerate(tasks) if t.get("id") == task_id), -1)
        
        if task_idx == -1:
            raise ValueError("Task not found")
            
        task = tasks[task_idx]
        completed = task.get("completed_subtopics", [])
        
        if subtopic in completed:
            completed.remove(subtopic)
        else:
            completed.append(subtopic)
            
        # Update DB
        db.study_plans.update_one(
            {"student_id": str(student_id), "tasks.id": task_id},
            {"$set": {f"tasks.{task_idx}.completed_subtopics": completed}}
        )
        
        # Determine if all subtopics are completed for frontend logic hint (optional)
        all_done = set(task.get("subtopics", [])) == set(completed)
        
        return {
            "task_id": task_id,
            "subtopic": subtopic,
            "completed": subtopic in completed,
            "all_subtopics_completed": all_done
        }
