# JPEE Backend (FastAPI + MongoDB)

This backend implements all three modules in sequence:
- Shared foundations: auth, JWT, refresh tokens, RBAC, MongoDB setup.
- Admin module: dashboard, users, content moderation, reports, CSV export.
- Teacher module: papers, classes, lesson plans, library management.
- Student module: test lifecycle, results, progress, library, feedback, notifications, chat.

## Tech
- FastAPI
- MongoDB (PyMongo)
- JWT auth (access + refresh)
- Pytest + TestClient + mongomock

## Quickstart

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. Configure environment:

```bash
cp .env.example .env
```

Required env updates in `backend/.env`:
- Set `JWT_SECRET_KEY` to a strong random value (default placeholder is rejected).
- Set `OPENAI_API_KEY` to enable real AI chat + AI-generated question sets.
  - When `OPENAI_API_KEY` is set, teacher paper generation requires AI output (no template fallback).

3. Start MongoDB + API (Docker):

```bash
docker compose up --build
```

Or run API locally:

```bash
make run
```

Runtime auto-seeding is disabled. Backend startup will use only existing MongoDB data.
- With `MONGODB_URI=mongomock://localhost`, data is in-memory and resets on backend restart.
- With real MongoDB, data persists.

## Seed Data

```bash
make seed
```

Seeded login credentials:
- Admin: `admin@jpee.com` / `admin12345`
- Teacher: `sharma@example.com` / `password123`
- Student: `rahul@example.com` / `password123`

To remove seeded/demo data from a persistent database:

```bash
python -m scripts.purge_demo_data
```

## API Docs
- Swagger UI: `http://localhost:8000/docs`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

## Tests

```bash
make test
```

## Implemented Endpoints (Phase 1)

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/me`

- `GET /api/v1/admin/dashboard`
- `GET /api/v1/admin/users`
- `POST /api/v1/admin/users`
- `PATCH /api/v1/admin/users/{user_id}/status`
- `GET /api/v1/admin/content-items`
- `PATCH /api/v1/admin/content-items/{content_id}/status`
- `GET /api/v1/admin/reports/analytics`
- `GET /api/v1/admin/reports/billing`
- `GET /api/v1/admin/reports/export?section=analytics&format=csv`

## Implemented Endpoints (Teacher)
- `GET /api/v1/teacher/home-summary`
- `GET /api/v1/teacher/papers`
- `POST /api/v1/teacher/papers`
- `GET /api/v1/teacher/papers/{paper_id}`
- `PATCH /api/v1/teacher/papers/{paper_id}`
- `POST /api/v1/teacher/papers/{paper_id}/assign`
- `GET /api/v1/teacher/classes`
- `POST /api/v1/teacher/classes`
- `GET /api/v1/teacher/classes/{class_id}/students`
- `GET /api/v1/teacher/lesson-plans`
- `POST /api/v1/teacher/lesson-plans`
- `PATCH /api/v1/teacher/lesson-plans/{lesson_id}`
- `DELETE /api/v1/teacher/lesson-plans/{lesson_id}`
- `GET /api/v1/teacher/library-items`
- `POST /api/v1/teacher/library-items/upload` (multipart, required for real file uploads; optional `publish_now=true` to make material immediately downloadable by students)

## Implemented Endpoints (Student + Shared)
- `GET /api/v1/student/home-summary`
- `GET /api/v1/student/tests`
- `POST /api/v1/student/tests/{test_id}/start`
- `POST /api/v1/student/attempts/{attempt_id}/answers`
- `POST /api/v1/student/attempts/{attempt_id}/submit`
- `GET /api/v1/student/results/{attempt_id}`
- `GET /api/v1/student/progress`
- `GET /api/v1/student/library-items`
- `GET /api/v1/student/library-downloads`
- `GET /api/v1/student/library-items/{item_id}/download` (serves stored original file)
- `POST /api/v1/student/feedback`
- `POST /api/v1/student/doubts/ask`
- `GET /api/v1/student/doubts`
- `GET /api/v1/notifications`
- `PATCH /api/v1/notifications/{notification_id}/read`
- `POST /api/v1/notifications/read-all`
- `POST /api/v1/chat/ask`
