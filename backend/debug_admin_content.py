import os
import sys
from pymongo import MongoClient
from dotenv import load_dotenv

# Add project root to path
sys.path.append(os.getcwd())

from app.services.admin_service import AdminService

load_dotenv()

def get_db_direct():
    uri = os.getenv("MONGODB_URI")
    db_name = os.getenv("MONGODB_DB", "jpee")
    if not uri:
        print("MONGODB_URI not found in .env")
        return None
    client = MongoClient(uri)
    return client[db_name]

def debug_content_items():
    db = get_db_direct()
    if db is None:
        return

    print("Checking 'content_items' collection...")
    count = db.content_items.count_documents({})
    print(f"Total documents in 'content_items': {count}")

    print("\nCalling AdminService.list_content_items...")
    try:
        items, meta = AdminService.list_content_items(
            db, 
            status_filter=None, 
            subject=None, 
            page=1, 
            limit=10
        )
        print(f"Service returned {len(items)} items.")
        print(f"Meta: {meta}")
        for item in items:
            print(f"- {item}")
    except Exception as e:
        print(f"Error calling service: {e}")
        import traceback
        traceback.print_exc()

    print("\nCalling AdminService.get_dashboard...")
    try:
        dashboard = AdminService.get_dashboard(db)
        print("Dashboard keys:", dashboard.keys())
    except Exception as e:
        print(f"Error calling dashboard: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_content_items()
