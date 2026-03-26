"""
Performance analysis service for test results.
Analyzes student performance, identifies weak topics, detects patterns, and generates AI feedback.
"""

from app.services.ai_service import call_openai


class AnalysisService:
    """Service for analyzing test performance and generating insights."""

    @staticmethod
    def analyze_performance(session: dict) -> dict:
        """
        Analyze student performance by topic and subtopic.

        Args:
            session: Dictionary containing:
                - questions: List of question objects
                - answers: Dict mapping question IDs to selected answers

        Returns:
            Dictionary with topic and subtopic statistics.
        """
        topic_stats = {}
        subtopic_stats = {}

        for q in session.get("questions", []):
            qid = str(q.get("id", ""))
            subject = q.get("subject", "General")
            topic = q.get("topic", "General")
            subtopic = q.get("subtopic", "General")

            # Initialize topic if not exists
            if topic not in topic_stats:
                topic_stats[topic] = {
                    "subject": subject,
                    "attempted": 0,
                    "correct": 0,
                    "wrong": 0,
                    "partial": 0,
                }

            # Initialize subtopic if not exists
            subtopic_key = f"{topic}::{subtopic}"
            if subtopic_key not in subtopic_stats:
                subtopic_stats[subtopic_key] = {
                    "subject": subject,
                    "topic": topic,
                    "attempted": 0,
                    "correct": 0,
                    "wrong": 0,
                    "partial": 0,
                }

            user_answer = session.get("answers", {}).get(qid)

            if user_answer is not None:
                topic_stats[topic]["attempted"] += 1
                subtopic_stats[subtopic_key]["attempted"] += 1

                # Check if correct
                if user_answer == q.get("correct"):
                    topic_stats[topic]["correct"] += 1
                    subtopic_stats[subtopic_key]["correct"] += 1
                else:
                    topic_stats[topic]["wrong"] += 1
                    subtopic_stats[subtopic_key]["wrong"] += 1
            else:
                # Unattempted - still count towards topic
                topic_stats[topic]["attempted"] += 1
                subtopic_stats[subtopic_key]["attempted"] += 1

        # Calculate accuracy for each topic and subtopic
        for topic_data in topic_stats.values():
            attempted = topic_data["attempted"]
            topic_data["accuracy"] = (
                (topic_data["correct"] / attempted) * 100
                if attempted > 0 else 0
            )

        for subtopic_data in subtopic_stats.values():
            attempted = subtopic_data["attempted"]
            subtopic_data["accuracy"] = (
                (subtopic_data["correct"] / attempted) * 100
                if attempted > 0 else 0
            )

        return {
            "topic_stats": topic_stats,
            "subtopic_stats": subtopic_stats,
        }

    @staticmethod
    def get_weak_topics(topic_stats: dict, threshold: float = 50.0) -> dict:
        """
        Identify weak topics where accuracy is below threshold.

        Args:
            topic_stats: Dictionary of topic statistics
            threshold: Accuracy threshold (default 50%)

        Returns:
            Dictionary with weak and strong topics.
        """
        weak_topics = []
        strong_topics = []

        for topic, data in topic_stats.items():
            accuracy = data.get("accuracy", 0)

            if accuracy < threshold:
                weak_topics.append({
                    "topic": topic,
                    "accuracy": round(accuracy, 1),
                    "correct": data["correct"],
                    "attempted": data["attempted"],
                })
            else:
                strong_topics.append({
                    "topic": topic,
                    "accuracy": round(accuracy, 1),
                    "correct": data["correct"],
                    "attempted": data["attempted"],
                })

        # Sort by accuracy (lowest first for weak, highest first for strong)
        weak_topics.sort(key=lambda x: x["accuracy"])
        strong_topics.sort(key=lambda x: x["accuracy"], reverse=True)

        return {
            "weak_topics": weak_topics,
            "strong_topics": strong_topics,
        }

    @staticmethod
    def detect_patterns(session: dict, question_set: list) -> dict:
        """
        Detect common mistake patterns.

        Args:
            session: Dictionary containing answers
            question_set: List of question objects

        Returns:
            Dictionary with mistake patterns.
        """
        patterns = {
            "conceptual_errors": 0,
            "calculation_errors": 0,
            "careless_mistakes": 0,
            "skipped_questions": 0,
        }

        mistake_examples = []

        for q in question_set:
            qid = str(q.get("id", ""))
            user_answer = session.get("answers", {}).get(qid)
            correct_answer = q.get("correct")
            explanation = q.get("explanation", "").lower()

            # Skipped questions
            if user_answer is None:
                patterns["skipped_questions"] += 1
                continue

            # Wrong answer - categorize the mistake
            if user_answer != correct_answer:
                if any(keyword in explanation for keyword in ["concept", "formula", "law", "principle", "rule"]):
                    patterns["conceptual_errors"] += 1
                    mistake_type = "Conceptual Error"
                elif any(keyword in explanation for keyword in ["calculate", "formula", "multiply", "divide", "add"]):
                    patterns["calculation_errors"] += 1
                    mistake_type = "Calculation Error"
                else:
                    patterns["careless_mistakes"] += 1
                    mistake_type = "Careless Mistake"

                mistake_examples.append({
                    "type": mistake_type,
                    "question_id": qid,
                    "topic": q.get("topic", "General"),
                    "subtopic": q.get("subtopic", "General"),
                })

        return {
            "patterns": patterns,
            "mistake_examples": mistake_examples[:5],  # Top 5 mistakes
        }

    @staticmethod
    async def generate_ai_feedback(
        analysis: dict,
        weak_topics: dict,
        patterns: dict,
        session_subject: str = "JEE",
    ) -> str:
        """
        Generate AI-powered feedback based on analysis.

        Args:
            analysis: Performance analysis dictionary
            weak_topics: Weak topics analysis
            patterns: Mistake patterns
            session_subject: Subject being tested (default JEE)

        Returns:
            AI-generated feedback string.
        """
        weak_list = weak_topics.get("weak_topics", [])
        weak_names = ", ".join([t["topic"] for t in weak_list[:3]])

        pattern_summary = patterns.get("patterns", {})
        top_mistake = max(
            [(k, v) for k, v in pattern_summary.items() if v > 0],
            key=lambda x: x[1],
            default=("No", 0)
        )[0]

        prompt = f"""You are a JEE test expert. Analyze this student's test performance:

Subject: {session_subject}

Weak Topics (Accuracy < 50%): {weak_names if weak_names else "None identified"}

Mistake Patterns:
- Conceptual Errors: {pattern_summary.get('conceptual_errors', 0)}
- Calculation Errors: {pattern_summary.get('calculation_errors', 0)}
- Careless Mistakes: {pattern_summary.get('careless_mistakes', 0)}
- Skipped Questions: {pattern_summary.get('skipped_questions', 0)}

Most Common Mistake Type: {top_mistake}

Please provide:
1. A brief analysis of key weaknesses (2-3 sentences)
2. Specific study recommendations for weak topics
3. Advice on reducing the most common mistake type
4. Predicted actions to improve the next score

Keep it concise, actionable, and encouraging. Format as clear bullet points."""

        try:
            feedback = await call_openai(prompt, max_tokens=500)
            return feedback or "Focus on weak topics and practice similar problems."
        except Exception:
            return "Continue practicing weak topics identified above. Each mistake is a learning opportunity!"

    @staticmethod
    def build_complete_analysis(
        session: dict,
        question_set: list,
        subject: str = "General",
    ) -> dict:
        """
        Build complete analysis combining all components.

        Args:
            session: Dictionary with questions and answers
            question_set: List of question objects
            subject: Test subject

        Returns:
            Complete analysis dictionary.
        """
        # Step 1: Analyze performance
        performance = AnalysisService.analyze_performance({
            "questions": question_set,
            "answers": session.get("answers", {}),
        })

        # Step 2: Find weak topics
        weak_analysis = AnalysisService.get_weak_topics(
            performance["topic_stats"],
            threshold=50.0
        )

        # Step 3: Detect patterns
        pattern_analysis = AnalysisService.detect_patterns(
            session, question_set)

        # Calculate overall metrics
        all_attempts = sum(
            t["attempted"] for t in performance["topic_stats"].values()
        )
        all_correct = sum(
            t["correct"] for t in performance["topic_stats"].values()
        )
        overall_accuracy = (all_correct / all_attempts *
                            100) if all_attempts > 0 else 0

        return {
            "overall_accuracy": round(overall_accuracy, 1),
            "topic_breakdown": performance["topic_stats"],
            "subtopic_breakdown": performance["subtopic_stats"],
            "weak_topics": weak_analysis["weak_topics"],
            "strong_topics": weak_analysis["strong_topics"],
            "mistake_patterns": pattern_analysis["patterns"],
            "mistake_examples": pattern_analysis["mistake_examples"],
            "total_questions_attempted": all_attempts,
            "total_correct": all_correct,
        }
