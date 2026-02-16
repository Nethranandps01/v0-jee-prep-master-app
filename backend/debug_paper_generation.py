
import asyncio
import os
import sys
from dotenv import load_dotenv

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.question_bank import _build_question_set_with_ai

load_dotenv()

async def debug_paper_generation():
    print("Debugging Paper Generation...")
    
    subject = "Physics"
    difficulty = "Medium"
    count = 5
    
    print(f"Request: {subject}, {difficulty}, {count} questions")
    
    # We can't call _build_question_set_with_ai directly because it calls call_openai which is likely async or sync?
    # call_openai in ai_service.py seems to be sync based on question_bank.py usage:
    # raw = call_openai(...) 
    
    # Let's check ai_service.py first to be sure.
    # actually question_bank.py imports call_openai.
    
    try:
        updated_questions = _build_question_set_with_ai(subject, count, difficulty)
        
        if updated_questions:
            print(f"✅ Application generated {len(updated_questions)} questions.")
            print(updated_questions[0])
        else:
            print("❌ Generation passed empty list (Failed).")
            
    except Exception as e:
        print(f"❌ Exception during generation: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_paper_generation())
