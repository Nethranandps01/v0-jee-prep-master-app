import sys
import os

# Add backend to path so we can import app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.client import create_mongo_client
from app.core.security import get_password_hash
from app.core.config import get_settings
from datetime import datetime, timezone

def seed_admin():
    settings = get_settings()
    print(f"Connecting to {settings.mongodb_uri}...")
    client = create_mongo_client(settings.mongodb_uri)
    db = client[settings.mongodb_db]
    
    admin_email = "admin@jpee.com"
    existing = db.users.find_one({"email": admin_email})
    
    if existing:
        print(f"Admin {admin_email} already exists.")
        db.users.update_one(
            {"_id": existing["_id"]},
            {"$set": {
                "password_hash": get_password_hash("admin12345"), 
                "role": "admin", 
                "status": "active"
            }}
        )
        print("Updated admin password/role.")
    else:
        print(f"Creating admin {admin_email}...")
        db.users.insert_one({
            "name": "Admin User",
            "email": admin_email,
            "password_hash": get_password_hash("admin12345"),
            "role": "admin",
            "status": "active",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        })
        print("Admin created.")

if __name__ == "__main__":
    seed_admin()
