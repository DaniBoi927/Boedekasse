"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const express_1 = require("express");
const db_1 = require("../db");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || 'padel-boedekasse-secret-key-change-in-production';
// Register
router.post('/register', async (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
        return res.status(400).json({ error: 'Email, password og navn er påkrævet' });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: 'Password skal være mindst 6 tegn' });
    }
    try {
        const pool = await (0, db_1.getPool)();
        // Check if user exists
        const existing = await pool.request()
            .input('email', email.toLowerCase())
            .query('SELECT id FROM users WHERE email = @email');
        if (existing.recordset.length > 0) {
            return res.status(400).json({ error: 'Email er allerede i brug' });
        }
        // Hash password
        const password_hash = await bcryptjs_1.default.hash(password, 10);
        // Create user
        const result = await pool.request()
            .input('email', email.toLowerCase())
            .input('password_hash', password_hash)
            .input('name', name)
            .query(`
        INSERT INTO users (email, password_hash, name) 
        OUTPUT INSERTED.id, INSERTED.email, INSERTED.name, INSERTED.created_at 
        VALUES (@email, @password_hash, @name)
      `);
        const user = result.recordset[0];
        // Generate token
        const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({
            user: { id: user.id, email: user.email, name: user.name },
            token
        });
    }
    catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Server fejl' });
    }
});
// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email og password er påkrævet' });
    }
    try {
        const pool = await (0, db_1.getPool)();
        const result = await pool.request()
            .input('email', email.toLowerCase())
            .query('SELECT * FROM users WHERE email = @email');
        if (result.recordset.length === 0) {
            return res.status(401).json({ error: 'Forkert email eller password' });
        }
        const user = result.recordset[0];
        const validPassword = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Forkert email eller password' });
        }
        // Generate token
        const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        res.json({
            user: { id: user.id, email: user.email, name: user.name },
            token
        });
    }
    catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server fejl' });
    }
});
// Get current user
router.get('/me', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Ikke logget ind' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const pool = await (0, db_1.getPool)();
        const result = await pool.request()
            .input('id', decoded.userId)
            .query('SELECT id, email, name, created_at FROM users WHERE id = @id');
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Bruger ikke fundet' });
        }
        res.json(result.recordset[0]);
    }
    catch (err) {
        return res.status(401).json({ error: 'Ugyldig token' });
    }
});
exports.default = router;
// Middleware to protect routes
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Ikke logget ind' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        req.userEmail = decoded.email;
        next();
    }
    catch (err) {
        return res.status(401).json({ error: 'Ugyldig token' });
    }
}
