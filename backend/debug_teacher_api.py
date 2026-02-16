import os
import sys
from pymongo import MongoClient
from dotenv import load_dotenv

# Add project root to path
sys.path.append(os.getcwd())

from app.services.teacher_service import TeacherService
from app.utils.mongo import parse_object_id

load_dotenv()

def get_db_direct():
    uri = os.getenv("MONGODB_URI")
    db_name = os.getenv("MONGODB_DB", "jpee") # Default to jpee if consistent with main app
    if not uri:
        print("MONGODB_URI not found in .env")
        return None
    client = MongoClient(uri)
    return client[db_name] 

def debug_attempts():
    db = get_db_direct()
    if db is None:
        return

    # 1. Find a student who has submitted an attempt
    attempt = db.test_attempts.find_one({"status": "submitted"})
    if not attempt:
        print("No submitted attempts found.")
        return

    student_id = str(attempt["student_id"])
    print(f"Found attempt for student {student_id}")

    try:
        # 2. Inspect the test document directly
        test_id = attempt.get("test_id")
        if test_id:
            test = db.tests.find_one({"_id": parse_object_id(test_id, "test_id")})
            if test:
                print(f"\nInspecting Test: {test.get('title')}")
                print(f"Keys: {list(test.keys())}")
                q_set = test.get('question_set')
                print(f"Question Set Type: {type(q_set)}")
                print(f"Question Set Length: {len(q_set) if q_set else 0}")
                print(f"Question Set Content: {q_set}")
            else:
                print(f"Test not found for ID: {test_id}")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_attempts()
