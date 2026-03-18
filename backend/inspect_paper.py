from pymongo import MongoClient
from bson import ObjectId
import json

client = MongoClient("mongodb://localhost:27017")
for db_name in ["jpm-api", "admin", "UserData", "userAuth", "jpee"]:
    db = client[db_name]
    paper = db.tests.find_one({"_id": ObjectId("69ba73c344778dd564be5a47")})
    if paper:
        print(f"Found in {db_name}:")
        print(json.dumps(paper, default=str, indent=4))
        break
else:
    print("Paper not found in any common database.")
