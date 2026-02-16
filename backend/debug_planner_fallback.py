from datetime import datetime, timezone
import json
from app.services.planner_service import PlannerService

def test_fallback_generation():
    print("Testing fallback task generation...")
    try:
        tasks = PlannerService._get_fallback_tasks(30)
        
        if not tasks:
            print("❌ No tasks generated!")
            return

        print(f"✅ Generated {len(tasks)} tasks.")
        
        missing_subtopics = 0
        for i, task in enumerate(tasks[:5]): # Check first 5
            print(f"\nTask {i+1}: {task['title']}")
            print(f"  Subject: {task['subject']}")
            print(f"  Subtopics: {json.dumps(task.get('subtopics', []), indent=2)}")
            
            if not task.get('subtopics'):
                missing_subtopics += 1
                print("  ❌ MISSING SUBTOPICS")
            else:
                print("  ✅ Subtopics present")

        if missing_subtopics == 0:
            print("\n✅ All checked tasks have subtopics.")
        else:
            print(f"\n❌ {missing_subtopics} tasks are missing subtopics.")

    except Exception as e:
        print(f"❌ Error during generation: {e}")

if __name__ == "__main__":
    test_fallback_generation()
