
import asyncio
import os
from app.services.ai_service import stream_chat_reply, stream_call_openai
from app.core.config import get_settings

# Mock settings if needed, but we rely on .env
# Ensure .env is loaded
from dotenv import load_dotenv
load_dotenv()

async def test_streaming():
    print("Testing OpenAI Streaming...")
    try:
        settings = get_settings()
        print(f"API Key present: {bool(settings.openai_api_key)}")
        print(f"Model: {settings.openai_model}")

        print("--- Starting Stream ---")
        async for chunk in stream_chat_reply("What is 2+2?"):
            print(f"Chunk: {chunk!r}")
        print("\n--- End of Stream ---")
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_streaming())
