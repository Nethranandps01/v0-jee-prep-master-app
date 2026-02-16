import os
import sys
from pymongo import MongoClient
from dotenv import load_dotenv
from passlib.context import CryptContext

# Add project root to path
sys.path.append(os.getcwd())

load_dotenv()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_db_direct():
    uri = os.getenv("MONGODB_URI")
    db_name = os.getenv("MONGODB_DB", "jpee")
    if not uri:
        print("MONGODB_URI not found in .env")
        return None
    client = MongoClient(uri)
    return client[db_name]

def check_admin():
    db = get_db_direct()
    if db is None:
        return

    print("Checking for admin users...")
    admins = list(db.users.find({"role": "admin"}))
    
    if not admins:
        print("No admin user found!")
        print("Creating default admin...")
        admin_data = {
            "email": "admin@example.com",
            "name": "Admin User",
            "role": "admin",
            "password_hash": pwd_context.hash("admin123"),
            "status": "active",
            "created_at": "2024-01-01T00:00:00Z"
        }
        db.users.insert_one(admin_data)
        print("Created admin: admin@example.com / admin123")
    else:
        print(f"Found {len(admins)} admin(s):")
        for admin in admins:
            print(f"- {admin.get('email')} (Status: {admin.get('status')})")
            
            # Reset password to ensure we can login
            db.users.update_one(
                {"_id": admin["_id"]},
                {"$set": {"password_hash": pwd_context.hash("admin12345")}}
            )
            print(f"  Reset password for {admin.get('email')} to 'admin12345'")

if __name__ == "__main__":
    check_admin()
