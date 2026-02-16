import os
import sys
from pymongo import MongoClient
from dotenv import load_dotenv

sys.path.append(os.getcwd())

from app.services.question_bank import _build_template_question_set
from app.utils.mongo import parse_object_id

load_dotenv()

def get_db_direct():
    uri = os.getenv("MONGODB_URI")
    db_name = os.getenv("MONGODB_DB", "jpee")
    if not uri:
        print("MONGODB_URI not found")
        return None
    client = MongoClient(uri)
    return client[db_name]

def fix_tests():
    db = get_db_direct()
    if db is None:
        return

    tests = list(db.tests.find({"question_set": {"$exists": False}}))
    print(f"Found {len(tests)} tests missing question_set")
    
    if not tests:
        # Check for empty list too
        tests = list(db.tests.find({"question_set": []}))
        print(f"Found {len(tests)} tests with empty question_set")

    for test in tests:
        print(f"Fixing test: {test.get('title')}")
        subject = test.get("subject", "Physics")
        topic = test.get("title", "General")
        
        # Determine number of questions
        num_questions = test.get("questions")
        try:
            count = int(num_questions)
        except (ValueError, TypeError):
            count = 15 # default if missing or invalid
            
        print(f"  Generating {count} questions for {subject}...")
        
        # Generate questions
        # Use templates for speed and reliability during debugging
        questions = _build_template_question_set(subject, count, "Medium")
        
        if questions:
            db.tests.update_one(
                {"_id": test["_id"]},
                {"$set": {"question_set": questions}}
            )
            print(f"  Updated {test.get('title')} with {len(questions)} questions")
        else:
            print("  Failed to generate questions")

if __name__ == "__main__":
    fix_tests()
