from bson import ObjectId
from fastapi import HTTPException, status



def parse_object_id(value: str, field_name: str = "id") -> ObjectId:
    try:
        return ObjectId(value)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {field_name}",
        ) from exc


def serialize_id(document: dict) -> dict:
    data = dict(document)
    if "_id" in data:
        data["id"] = str(data.pop("_id"))
    return data
