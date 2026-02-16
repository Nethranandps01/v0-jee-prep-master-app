# JPM Full Stack (Frontend + FastAPI + MongoDB)

## Run Everything (Recommended)

### 1. Start backend + MongoDB

```bash
cd backend
cp .env.example .env
docker compose up --build
```

Before starting backend, update `backend/.env`:
- Set `JWT_SECRET_KEY` to a strong random value.
- Set `OPENAI_API_KEY` to enable real AI chat/question generation.

Backend API: `http://localhost:8000`
Swagger: `http://localhost:8000/docs`

### 2. Start frontend

Open a second terminal:

```bash
cd /home/lokesh/jpm
npm run dev
```

Frontend: `http://localhost:3000`

## Demo Login Accounts (Only if You Seed Data)

- Admin: `admin@jpee.com` / `admin12345`
- Teacher: `sharma@example.com` / `password123`
- Student: `rahul@example.com` / `password123`

## Notes

- Backend startup never auto-seeds demo data; it reads only existing MongoDB records.
- To insert demo data intentionally, run `cd backend && make seed`.
- To purge seeded/demo records, run `cd backend && python -m scripts.purge_demo_data`.
- Library uploads now store real file bytes in Mongo and student downloads return the original file.
- If MongoDB is real (Docker/local), data persists across backend restarts.
- If you run with `mongomock://...`, data is in-memory and resets on restart.
