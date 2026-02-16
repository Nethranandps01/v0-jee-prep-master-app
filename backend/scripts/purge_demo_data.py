from __future__ import annotations

import argparse
from typing import Any

from bson import ObjectId

from app.core.config import get_settings
from app.db.client import create_mongo_client


DEMO_TEST_TITLES = {
    "JEE Main Mock Test #12",
    "Mechanics & Thermodynamics",
    "Organic Chemistry Marathon",
    "Calculus & Algebra",
    "Preview Check",
    "Debug visibility paper",
    "Review Draft Visibility Check",
    "Custom Physics Practice",
}

DEMO_TEST_TITLE_PREFIXES = (
    "Smoke Test ",
    "Flow Paper ",
    "AI Paper Runtime Check",
)

DEMO_LIBRARY_TITLES = {
    "NCERT Physics Class 12",
    "Previous Year Questions (2015-2025)",
    "POC Real File Upload",
    "Role Smoke Real Download",
    "Instant Visibility Check",
}

DEMO_LIBRARY_TITLE_PREFIXES = ("Flow Material ",)

DEMO_CONTENT_TITLES = {
    "NCERT Physics Class 12",
    "Previous Year Questions (2015-2025)",
    "Rotation Dynamics - Notes",
    "Organic Reactions Flowchart",
    "Integration Shortcuts PDF",
    "POC Real File Upload",
    "Role Smoke Real Download",
    "Instant Visibility Check",
}

DEMO_CONTENT_TITLE_PREFIXES = ("Flow Material ",)

DEMO_CLASS_NAMES = {
    "JEE 2026 Batch A",
    "JEE 2026 Batch B",
    "JEE 2027 Foundation",
}

DEMO_LESSON_TOPICS = {
    "Newton's Laws of Motion",
    "Coordination Compounds",
}


def _delete_many(collection, query: dict[str, Any], *, dry_run: bool) -> int:
    if dry_run:
        return int(collection.count_documents(query))
    return int(collection.delete_many(query).deleted_count)


def _title_query(*, field: str, titles: set[str], prefixes: tuple[str, ...]) -> dict[str, Any]:
    clauses: list[dict[str, Any]] = []
    if titles:
        clauses.append({field: {"$in": sorted(titles)}})
    for prefix in prefixes:
        clauses.append({field: {"$regex": f"^{prefix}"}})
    if not clauses:
        return {"_id": {"$exists": False}}
    if len(clauses) == 1:
        return clauses[0]
    return {"$or": clauses}


def _collect_ids(collection, query: dict[str, Any]) -> list[ObjectId]:
    return [doc["_id"] for doc in collection.find(query, {"_id": 1})]


def main() -> None:
    parser = argparse.ArgumentParser(description="Purge seeded/demo project data from MongoDB.")
    parser.add_argument("--dry-run", action="store_true", help="Show how many docs would be removed.")
    args = parser.parse_args()

    settings = get_settings()
    client = create_mongo_client(settings.mongodb_uri)
    db = client[settings.mongodb_db]

    summary: list[tuple[str, int]] = []

    test_query = _title_query(field="title", titles=DEMO_TEST_TITLES, prefixes=DEMO_TEST_TITLE_PREFIXES)
    demo_test_ids = _collect_ids(db.tests, test_query)
    demo_test_id_strings = [str(oid) for oid in demo_test_ids]
    if demo_test_id_strings:
        summary.append(
            (
                "test_attempts",
                _delete_many(
                    db.test_attempts,
                    {"test_id": {"$in": demo_test_id_strings}},
                    dry_run=args.dry_run,
                ),
            )
        )
    summary.append(("tests", _delete_many(db.tests, test_query, dry_run=args.dry_run)))

    library_query = _title_query(
        field="title",
        titles=DEMO_LIBRARY_TITLES,
        prefixes=DEMO_LIBRARY_TITLE_PREFIXES,
    )
    demo_library_ids = _collect_ids(db.library_items, library_query)
    demo_library_id_strings = [str(oid) for oid in demo_library_ids]
    if demo_library_id_strings:
        summary.append(
            (
                "library_files",
                _delete_many(
                    db.library_files,
                    {"library_item_id": {"$in": demo_library_id_strings}},
                    dry_run=args.dry_run,
                ),
            )
        )
        summary.append(
            (
                "library_downloads",
                _delete_many(
                    db.library_downloads,
                    {"library_item_id": {"$in": demo_library_id_strings}},
                    dry_run=args.dry_run,
                ),
            )
        )
    summary.append(
        (
            "library_items",
            _delete_many(
                db.library_items,
                library_query,
                dry_run=args.dry_run,
            ),
        )
    )

    content_query = _title_query(
        field="title",
        titles=DEMO_CONTENT_TITLES,
        prefixes=DEMO_CONTENT_TITLE_PREFIXES,
    )
    if demo_library_id_strings:
        linked_content_query = {"library_item_id": {"$in": demo_library_id_strings}}
        content_query = {"$or": [content_query, linked_content_query]}
    summary.append(("content_items", _delete_many(db.content_items, content_query, dry_run=args.dry_run)))

    summary.append(
        (
            "classes",
            _delete_many(
                db.classes,
                {"name": {"$in": sorted(DEMO_CLASS_NAMES)}},
                dry_run=args.dry_run,
            ),
        )
    )
    summary.append(
        (
            "lesson_plans",
            _delete_many(
                db.lesson_plans,
                {"topic": {"$in": sorted(DEMO_LESSON_TOPICS)}},
                dry_run=args.dry_run,
            ),
        )
    )

    # Existing notifications/activity/reports in this project were generated from demo or smoke checks.
    summary.append(("notifications", _delete_many(db.notifications, {}, dry_run=args.dry_run)))
    summary.append(("activity_logs", _delete_many(db.activity_logs, {}, dry_run=args.dry_run)))
    summary.append(("usage_metrics", _delete_many(db.usage_metrics, {}, dry_run=args.dry_run)))
    summary.append(("billing_reports", _delete_many(db.billing_reports, {}, dry_run=args.dry_run)))

    action_word = "Would remove" if args.dry_run else "Removed"
    print(f"{action_word} documents:")
    total = 0
    for collection_name, deleted in summary:
        total += deleted
        print(f"- {collection_name}: {deleted}")
    print(f"Total: {total}")

    client.close()


if __name__ == "__main__":
    main()
