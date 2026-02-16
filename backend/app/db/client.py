from pymongo import MongoClient



def create_mongo_client(uri: str) -> MongoClient:
    if uri.startswith("mongomock://"):
        import mongomock

        return mongomock.MongoClient()
    return MongoClient(uri, tz_aware=True)
