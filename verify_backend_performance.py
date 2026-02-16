import sys
import os
import time
from datetime import datetime
import asyncio
from pprint import pprint

# Add backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), "backend"))

# Mock env for local testing
os.environ["JWT_SECRET_KEY"] = "local-test-secret-key-min-32-chars-long"

from app.db.client import create_mongo_client
from app.services.student_service import StudentService
from app.core.config import get_settings

def benchmark():
    print("--- Starting Backend Performance Benchmark ---")
    
    settings = get_settings()
    client = create_mongo_client(settings.mongodb_uri)
    db = client[settings.mongodb_db]
    
    # 1. Get a student user
    student = db.users.find_one({"role": "student"})
    if not student:
        print("Error: No student found in database.")
        return

    print(f"Benchmarking for student: {student.get('name')} ({student['_id']})")
    
    # 2. Benchmark list_tests
    print("\n[Test 1] StudentService.list_tests (Batch Fetch)")
    start_time = time.time()
    # Call the method directly
    tests = StudentService.list_tests(db, student, status_filter=None, subject=None)
    end_time = time.time()
    duration_ms = (end_time - start_time) * 1000
    
    print(f"-> Fetched {len(tests)} tests in {duration_ms:.2f}ms")
    if duration_ms > 200:
        print("WARNING: list_tests is slower than expected (>200ms)")
    else:
        print("PASS: list_tests is performant")

    # 3. Benchmark progress
    print("\n[Test 2] StudentService.progress (Aggregation Ranking)")
    start_time = time.time()
    progress = StudentService.progress(db, student)
    end_time = time.time()
    duration_ms = (end_time - start_time) * 1000
    
    print(f"-> Calculated progress in {duration_ms:.2f}ms")
    print(f"-> Rank: {progress['overall_rank']}/{progress['total_students']}")
    
    if duration_ms > 200:
        print("WARNING: progress is slower than expected (>200ms)")
    else:
        print("PASS: progress is performant")

    print("\n--- Benchmark Complete ---")

if __name__ == "__main__":
    benchmark()
