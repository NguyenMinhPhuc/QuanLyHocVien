const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS || '10', 10);

const { authenticateToken, requireRole } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// POST /api/auth/register
// Protected: only authenticated users with role 'administrator' can create users
router.post('/register',
  authenticateToken,
  requireRole('administrator'),
  body('username').isLength({ min: 3 }).withMessage('username must be at least 3 chars'),
  body('password').isLength({ min: 6 }).withMessage('password must be at least 6 chars'),
  body('role').isIn(['administrator', 'teacher', 'parent', 'student']).withMessage('invalid role'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { username, password, role } = req.body;
      // check existing using stored procedure
      const p = await db.getPool();
      const existing = await p.request().input('username', username).execute('sp_users_get_by_username');
      if (existing.recordset && existing.recordset.length) return res.status(409).json({ error: 'Username already exists' });

      const salt = await bcrypt.genSalt(SALT_ROUNDS);
      const hash = await bcrypt.hash(password, salt);

      const result = await p.request()
        .input('username', username)
        .input('password_hash', hash)
        .input('role', role)
        .execute('sp_users_create');

      const user = result.recordset && result.recordset[0];
      res.status(201).json({ id: user.id, username: user.username, role: user.role });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// POST /api/auth/login
router.post('/login',
  body('username').isLength({ min: 1 }).withMessage('username required'),
  body('password').isLength({ min: 1 }).withMessage('password required'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { username, password } = req.body;
      console.log('[auth] login attempt for:', username);
      const p = await db.getPool();
      const q = await p.request().input('username', username).execute('sp_users_get_by_username');
      const user = q.recordset && q.recordset[0];
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });

      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) return res.status(401).json({ error: 'Invalid credentials' });

      // Create access token (short-lived) and refresh token (stored in DB)
      const accessToken = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m' });

      // create a secure random refresh token string
      const crypto = require('crypto');
      const refreshToken = crypto.randomBytes(64).toString('hex');
      const refreshExpiresInDays = parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || '7', 10);
      const expiresAt = new Date(Date.now() + refreshExpiresInDays * 24 * 60 * 60 * 1000);

      // store refresh token in DB
      await p.request()
        .input('user_id', user.id)
        .input('token', refreshToken)
        .input('expires_at', expiresAt)
        .execute('sp_refresh_create');

      // set cookies (HttpOnly)
      const cookieOptions = {
        httpOnly: true,
        sameSite: process.env.COOKIE_SAMESITE || 'lax', // 'lax' for dev, 'none' for cross-site in prod
        secure: process.env.NODE_ENV === 'production',
      };
      // access token cookie (short)
      res.cookie('access_token', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
      // refresh token cookie (long)
      res.cookie('refresh_token', refreshToken, { ...cookieOptions, maxAge: refreshExpiresInDays * 24 * 60 * 60 * 1000 });

      res.json({ user: { id: user.id, username: user.username, role: user.role } });
    } catch (err) {
      console.error('[auth] login error:', err && err.stack || err);
      if (process.env.NODE_ENV === 'development') return res.status(500).json({ error: err.message || 'Server error' });
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// POST /api/auth/refresh - rotate refresh token and issue new access token
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies && req.cookies['refresh_token'];
    if (!refreshToken) return res.status(401).json({ error: 'Missing refresh token' });

    const p = await db.getPool();
    const q = await p.request().input('token', refreshToken).execute('sp_refresh_get_by_token');
    const row = q.recordset && q.recordset[0];
    if (!row) return res.status(403).json({ error: 'Invalid refresh token' });

    const now = new Date();
    if (new Date(row.expires_at) < now) {
      // expired - remove it
      await p.request().input('token', refreshToken).execute('sp_refresh_delete');
      return res.status(403).json({ error: 'Refresh token expired' });
    }

    // issue new access token and rotate refresh token
    const userId = row.user_id;

    // load user role
    const userQ = await p.request().input('username', null).query('SELECT id, username, role FROM Users WHERE id = ' + userId);
    const user = userQ.recordset && userQ.recordset[0];
    if (!user) return res.status(401).json({ error: 'User not found' });

    const accessToken = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m' });

    // rotate refresh token
    const crypto = require('crypto');
    const newRefresh = crypto.randomBytes(64).toString('hex');
    const refreshExpiresInDays = parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || '7', 10);
    const expiresAt = new Date(Date.now() + refreshExpiresInDays * 24 * 60 * 60 * 1000);

    // delete old and create new
    await p.request().input('token', refreshToken).execute('sp_refresh_delete');
    await p.request().input('user_id', user.id).input('token', newRefresh).input('expires_at', expiresAt).execute('sp_refresh_create');

    const cookieOptions = { httpOnly: true, sameSite: process.env.COOKIE_SAMESITE || 'lax', secure: process.env.NODE_ENV === 'production' };
    res.cookie('access_token', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
    res.cookie('refresh_token', newRefresh, { ...cookieOptions, maxAge: refreshExpiresInDays * 24 * 60 * 60 * 1000 });

    res.json({ user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    console.error('[auth] refresh error:', err && err.stack || err);
    if (process.env.NODE_ENV === 'development') return res.status(500).json({ error: err.message || 'Server error' });
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/logout - revoke refresh token and clear cookies
router.post('/logout', async (req, res) => {
  try {
    const refreshToken = req.cookies && req.cookies['refresh_token'];
    if (refreshToken) {
      const p = await db.getPool();
      await p.request().input('token', refreshToken).execute('sp_refresh_delete');
    }
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    res.json({ ok: true });
  } catch (err) {
    console.error('[auth] logout error:', err && err.stack || err);
    if (process.env.NODE_ENV === 'development') return res.status(500).json({ error: err.message || 'Server error' });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
