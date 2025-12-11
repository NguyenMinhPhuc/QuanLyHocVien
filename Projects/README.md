# Center Management (Next.js + Node.js + SQL Server)

This repository contains a minimal scaffold for a center management webapp using:
- Frontend: Next.js
- Backend: Node.js (Express)
- Database: Microsoft SQL Server

What is included:
- `server/` — Express API with `mssql` connection and example CRUD endpoints for Students, Teachers, Courses.
- `frontend/` — Minimal Next.js app with a sample page.
- `sql/schema.sql` — SQL Server schema to create the required tables.
- `.env.example` — Example environment variables.

Quick start (PowerShell)

1) Configure SQL Server and create a database. Run the SQL in `sql/schema.sql` against your DB.

2) Create a `.env` in `server/` based on `.env.example` and set your SQL Server connection.

3) Start the backend:

```powershell
cd server
npm install
npm run dev
```

4) Start the frontend:

```powershell
cd frontend
npm install
npm run dev
```

API endpoints (examples):
- `GET /api/students` (backend: http://localhost:4000/api/students)
- `POST /api/students` (send JSON body)

Next steps:
- Implement full CRUD for all entities
- Add authentication and roles (administrator, teacher, parent, student)
- Add frontend pages + admin UI


login info:
user: admin1
pass: Secret123!