from typing import Any, Dict, List, Union

JEE_RULES = {
    "MCQ_MAIN": {
        "correct": 4,
        "wrong": -1,
        "unattempted": 0
    },
    "NUMERICAL_MAIN": {
        "correct": 4,
        "wrong": 0,
        "unattempted": 0
    },
    "ADV_SINGLE": {
        "correct": 3,
        "wrong": -1,
        "unattempted": 0
    },
    "ADV_MULTIPLE": {
        "full_correct": 4,
        "partial_correct": 2,
        "wrong": -2,
        "unattempted": 0
    }
}

class ScoringService:
    @staticmethod
    def calculate_jee_score(questions: List[Dict[str, Any]], user_answers: Dict[str, Any]) -> Dict[str, Any]:
        """
        Core scoring engine for JEE tests (Main and Advanced).
        """
        total_score = 0
        stats = {
            "correct": 0,
            "wrong": 0,
            "unattempted": 0,
            "partial": 0
        }

        for q in questions:
            qid = str(q.get("id"))
            # Default to MCQ_MAIN if type is missing or invalid for backward compatibility
            qtype = q.get("type", "MCQ_MAIN")
            if qtype not in JEE_RULES:
                qtype = "MCQ_MAIN"
                
            correct = q.get("correct")
            user_ans = user_answers.get(qid)

            # 🟡 UNATTEMPTED
            if user_ans is None:
                total_score += JEE_RULES[qtype].get("unattempted", 0)
                stats["unattempted"] += 1
                continue

            # 🟢 MCQ / SINGLE
            if qtype in ["MCQ_MAIN", "ADV_SINGLE"]:
                if user_ans == correct:
                    total_score += JEE_RULES[qtype]["correct"]
                    stats["correct"] += 1
                else:
                    total_score += JEE_RULES[qtype]["wrong"]
                    stats["wrong"] += 1

            # 🔢 NUMERICAL
            elif qtype == "NUMERICAL_MAIN":
                # Convert to float for numerical comparison to handle 5 vs 5.0
                try:
                    if float(user_ans) == float(correct):
                        total_score += JEE_RULES[qtype]["correct"]
                        stats["correct"] += 1
                    else:
                        total_score += JEE_RULES[qtype]["wrong"]
                        stats["wrong"] += 1
                except (ValueError, TypeError):
                    total_score += JEE_RULES[qtype]["wrong"]
                    stats["wrong"] += 1

            # ☑️ MULTIPLE CORRECT (ADVANCED)
            elif qtype == "ADV_MULTIPLE":
                if not isinstance(correct, list):
                    # Fallback if DB data is inconsistent
                    correct_set = {correct} if correct is not None else set()
                else:
                    correct_set = set(correct)
                
                if not isinstance(user_ans, list):
                    user_set = {user_ans} if user_ans is not None else set()
                else:
                    user_set = set(user_ans)

                if user_set == correct_set:
                    total_score += JEE_RULES[qtype]["full_correct"]
                    stats["correct"] += 1

                elif user_set.issubset(correct_set) and len(user_set) > 0:
                    total_score += JEE_RULES[qtype]["partial_correct"]
                    stats["partial"] += 1

                else:
                    total_score += JEE_RULES[qtype]["wrong"]
                    stats["wrong"] += 1

        total_questions = len(questions)
        accuracy = (stats["correct"] / total_questions) * 100 if total_questions else 0

        return {
            "score": total_score,
            "stats": stats,
            "accuracy": round(accuracy, 2)
        }

    @staticmethod
    def _is_wrong(q: Dict[str, Any], user_ans: Any) -> bool:
        """
        Helper for analysis: Determines if an answer was wrong (or partial, which is not fully correct).
        """
        if user_ans is None:
            return False # Unattempted is separate
            
        qtype = q.get("type", "MCQ_MAIN")
        correct = q.get("correct")
        
        if qtype in ["MCQ_MAIN", "ADV_SINGLE"]:
            return user_ans != correct
        elif qtype == "NUMERICAL_MAIN":
            try:
                return float(user_ans) != float(correct)
            except (ValueError, TypeError):
                return True
        elif qtype == "ADV_MULTIPLE":
            if not isinstance(correct, list):
                correct_set = {correct} if correct is not None else set()
            else:
                correct_set = set(correct)
            
            if not isinstance(user_ans, list):
                user_set = {user_ans} if user_ans is not None else set()
            else:
                user_set = set(user_ans)
                
            return user_set != correct_set # Treat partial as "not fully correct" for weakness tracking
            
        return False
