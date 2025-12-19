const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

function authenticateToken(req, res, next) {
  // Accept token from Authorization header or HttpOnly cookie 'access_token'
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  if (!token && req.cookies) token = req.cookies['access_token'];
  if (!token) return res.status(401).json({ error: 'Missing token' });

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = { id: payload.userId, role: payload.role };
    next();
  });
}

function requireRole(...allowedRoles) {
  // normalize roles to be case-insensitive and tolerant to small differences
  const normalize = (r) => (r || '').toString().toLowerCase().replace(/[^a-z]/g, '');
  const canonical = (r) => {
    const n = normalize(r);
    if (n === 'administrator' || n === 'administrators' || n === 'admins') return 'admin';
    if (n === 'teachers') return 'teacher';
    if (n === 'parents') return 'parent';
    if (n === 'students') return 'student';
    return n;
  };
  const allowed = allowedRoles.map(canonical);
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    const userRole = canonical(req.user.role);
    if (allowed.includes(userRole)) return next();
    console.warn('[auth] forbidden role', { userId: req.user.id, role: req.user.role, canonical: userRole, allowed });
    return res.status(403).json({ error: 'Forbidden: insufficient role' });
  };
}

module.exports = { authenticateToken, requireRole };
