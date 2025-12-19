const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const studentsRouter = require('./routes/students');
const teachersRouter = require('./routes/teachers');
const coursesRouter = require('./routes/courses');
const classesRouter = require('./routes/classes');
const attendanceRouter = require('./routes/attendance');
const assignmentsRouter = require('./routes/assignments');
const submissionsRouter = require('./routes/submissions');
const progressRouter = require('./routes/progress');
const schedulesRouter = require('./routes/schedules');
const dashboardRouter = require('./routes/dashboard');
const notificationsRouter = require('./routes/notifications');
const parentsRouter = require('./routes/parents');
const enrollmentsRouter = require('./routes/enrollments');
const receiptsRouter = require('./routes/receipts');
const searchRouter = require('./routes/search');
const settingsRouter = require('./routes/settings');
const filesRouter = require('./routes/files');
const authRouter = require('./routes/auth');
const { authenticateToken } = require('./middleware/auth');

const app = express();
const path = require('path');
const PORT = process.env.PORT || 4000;

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));
// respond to preflight requests
app.options('*', cors({ origin: FRONTEND_ORIGIN, credentials: true }));
app.use(cookieParser());
app.use(express.json());

app.get('/', (req, res) => res.send('Center Management API'));

// public auth
app.use('/api/auth', authRouter);

// core resources (controllers use stored procedures)
app.use('/api/students', studentsRouter);
app.use('/api/teachers', teachersRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/classes', classesRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/assignments', assignmentsRouter);
app.use('/api/submissions', submissionsRouter);
app.use('/api/progress', progressRouter);
app.use('/api/schedules', schedulesRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/parents', parentsRouter);
app.use('/api', enrollmentsRouter);
app.use('/api/receipts', receiptsRouter);
app.use('/api/search', searchRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/files', filesRouter);

// serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// example protected route - return richer user profile
const db = require('./db');
app.get('/api/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    // read base user row
    const urows = await db.query('SELECT id, username, role, status FROM Users WHERE id = @id', { id: userId });
    const userRow = urows && urows[0];
    if (!userRow) return res.json({ id: userId, role: req.user.role });

    // Try to enrich profile from Teachers, Students, or Parents table linked by user_id
    let profile = { id: userRow.id, username: userRow.username, role: userRow.role };

    try {
      const t = await db.query('SELECT name, email, phone FROM Teachers WHERE user_id = @id', { id: userId });
      if (t && t[0]) {
        profile = { ...profile, name: t[0].name, email: t[0].email, phone: t[0].phone };
        return res.json(profile);
      }
    } catch (e) { /* ignore and try next */ }

    try {
      const s = await db.query('SELECT name, email, phone FROM Students WHERE user_id = @id', { id: userId });
      if (s && s[0]) {
        profile = { ...profile, name: s[0].name, email: s[0].email, phone: s[0].phone };
        return res.json(profile);
      }
    } catch (e) { /* ignore and try next */ }

    try {
      const p = await db.query('SELECT name, email, phone FROM Parents WHERE user_id = @id', { id: userId });
      if (p && p[0]) {
        profile = { ...profile, name: p[0].name, email: p[0].email, phone: p[0].phone };
        return res.json(profile);
      }
    } catch (e) { /* ignore */ }

    // fallback: return the basic user info
    profile.name = profile.username;
    return res.json(profile);
  } catch (err) {
    console.error('GET /api/me error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// basic health
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
