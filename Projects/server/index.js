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
app.use('/api/settings', settingsRouter);
app.use('/api/files', filesRouter);

// serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// example protected route
app.get('/api/me', authenticateToken, (req, res) => {
  res.json({ id: req.user.id, role: req.user.role });
});

// basic health
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
