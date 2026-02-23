"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("./auth");
const crypto_1 = __importDefault(require("crypto"));
const router = (0, express_1.Router)();
// Generate invite code
function generateInviteCode() {
    return crypto_1.default.randomBytes(4).toString('hex').toUpperCase();
}
// Create team
router.post('/', auth_1.authMiddleware, async (req, res) => {
    const { name } = req.body;
    const userId = req.userId;
    if (!name || name.trim().length < 2) {
        return res.status(400).json({ error: 'Team navn skal være mindst 2 tegn' });
    }
    try {
        const pool = await (0, db_1.getPool)();
        const invite_code = generateInviteCode();
        // Create team
        const teamResult = await pool.request()
            .input('name', name.trim())
            .input('invite_code', invite_code)
            .input('created_by', userId)
            .query(`
        INSERT INTO teams (name, invite_code, created_by) 
        OUTPUT INSERTED.* 
        VALUES (@name, @invite_code, @created_by)
      `);
        const team = teamResult.recordset[0];
        // Add creator as formand (chairman)
        await pool.request()
            .input('team_id', team.id)
            .input('user_id', userId)
            .input('role', 'formand')
            .query(`
        INSERT INTO team_members (team_id, user_id, role) 
        VALUES (@team_id, @user_id, @role)
      `);
        res.status(201).json(team);
    }
    catch (err) {
        console.error('Create team error:', err);
        res.status(500).json({ error: 'Server fejl' });
    }
});
// Get my teams
router.get('/my', auth_1.authMiddleware, async (req, res) => {
    const userId = req.userId;
    try {
        const pool = await (0, db_1.getPool)();
        const result = await pool.request()
            .input('user_id', userId)
            .query(`
        SELECT t.*, tm.role, 
          (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count
        FROM teams t
        JOIN team_members tm ON t.id = tm.team_id
        WHERE tm.user_id = @user_id
        ORDER BY t.created_at DESC
      `);
        res.json(result.recordset);
    }
    catch (err) {
        console.error('Get teams error:', err);
        res.status(500).json({ error: 'Server fejl' });
    }
});
// Get team by id
router.get('/:id', auth_1.authMiddleware, async (req, res) => {
    const { id } = req.params;
    const userId = req.userId;
    try {
        const pool = await (0, db_1.getPool)();
        // Check membership
        const memberCheck = await pool.request()
            .input('team_id', id)
            .input('user_id', userId)
            .query('SELECT role FROM team_members WHERE team_id = @team_id AND user_id = @user_id');
        if (memberCheck.recordset.length === 0) {
            return res.status(403).json({ error: 'Du er ikke medlem af dette team' });
        }
        const result = await pool.request()
            .input('id', id)
            .query('SELECT * FROM teams WHERE id = @id');
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Team ikke fundet' });
        }
        const team = result.recordset[0];
        team.myRole = memberCheck.recordset[0].role;
        res.json(team);
    }
    catch (err) {
        console.error('Get team error:', err);
        res.status(500).json({ error: 'Server fejl' });
    }
});
// Get team members
router.get('/:id/members', auth_1.authMiddleware, async (req, res) => {
    const { id } = req.params;
    const userId = req.userId;
    try {
        const pool = await (0, db_1.getPool)();
        // Check membership
        const memberCheck = await pool.request()
            .input('team_id', id)
            .input('user_id', userId)
            .query('SELECT role FROM team_members WHERE team_id = @team_id AND user_id = @user_id');
        if (memberCheck.recordset.length === 0) {
            return res.status(403).json({ error: 'Du er ikke medlem af dette team' });
        }
        const result = await pool.request()
            .input('team_id', id)
            .query(`
        SELECT tm.id, tm.role, tm.joined_at, u.id as user_id, u.name, u.email
        FROM team_members tm
        JOIN users u ON tm.user_id = u.id
        WHERE tm.team_id = @team_id
        ORDER BY tm.role DESC, tm.joined_at ASC
      `);
        res.json(result.recordset);
    }
    catch (err) {
        console.error('Get members error:', err);
        res.status(500).json({ error: 'Server fejl' });
    }
});
// Join team with invite code
router.post('/join', auth_1.authMiddleware, async (req, res) => {
    const { invite_code } = req.body;
    const userId = req.userId;
    if (!invite_code) {
        return res.status(400).json({ error: 'Invitationskode er påkrævet' });
    }
    try {
        const pool = await (0, db_1.getPool)();
        // Find team
        const teamResult = await pool.request()
            .input('invite_code', invite_code.toUpperCase())
            .query('SELECT * FROM teams WHERE invite_code = @invite_code');
        if (teamResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Ugyldigt invitationskode' });
        }
        const team = teamResult.recordset[0];
        // Check if already member
        const memberCheck = await pool.request()
            .input('team_id', team.id)
            .input('user_id', userId)
            .query('SELECT id FROM team_members WHERE team_id = @team_id AND user_id = @user_id');
        if (memberCheck.recordset.length > 0) {
            return res.status(400).json({ error: 'Du er allerede medlem af dette team' });
        }
        // Add as member
        await pool.request()
            .input('team_id', team.id)
            .input('user_id', userId)
            .input('role', 'member')
            .query('INSERT INTO team_members (team_id, user_id, role) VALUES (@team_id, @user_id, @role)');
        res.json({ message: 'Du er nu medlem af ' + team.name, team });
    }
    catch (err) {
        console.error('Join team error:', err);
        res.status(500).json({ error: 'Server fejl' });
    }
});
// Update member role (only formand can do this)
router.put('/:id/members/:memberId/role', auth_1.authMiddleware, async (req, res) => {
    const { id, memberId } = req.params;
    const { role } = req.body;
    const userId = req.userId;
    if (!role || !['formand', 'member'].includes(role)) {
        return res.status(400).json({ error: 'Ugyldig rolle' });
    }
    try {
        const pool = await (0, db_1.getPool)();
        // Check if requester is formand
        const formandCheck = await pool.request()
            .input('team_id', id)
            .input('user_id', userId)
            .query('SELECT role FROM team_members WHERE team_id = @team_id AND user_id = @user_id');
        if (formandCheck.recordset.length === 0 || formandCheck.recordset[0].role !== 'formand') {
            return res.status(403).json({ error: 'Kun formanden kan ændre roller' });
        }
        // Update role
        await pool.request()
            .input('id', memberId)
            .input('role', role)
            .query('UPDATE team_members SET role = @role WHERE id = @id');
        res.json({ message: 'Rolle opdateret' });
    }
    catch (err) {
        console.error('Update role error:', err);
        res.status(500).json({ error: 'Server fejl' });
    }
});
// Leave team
router.delete('/:id/leave', auth_1.authMiddleware, async (req, res) => {
    const { id } = req.params;
    const userId = req.userId;
    try {
        const pool = await (0, db_1.getPool)();
        // Check if user is the only formand
        const formandCheck = await pool.request()
            .input('team_id', id)
            .query(`SELECT user_id FROM team_members WHERE team_id = @team_id AND role = 'formand'`);
        if (formandCheck.recordset.length === 1 && formandCheck.recordset[0].user_id === userId) {
            return res.status(400).json({ error: 'Du kan ikke forlade teamet som eneste formand. Udnævn en ny formand først.' });
        }
        await pool.request()
            .input('team_id', id)
            .input('user_id', userId)
            .query('DELETE FROM team_members WHERE team_id = @team_id AND user_id = @user_id');
        res.json({ message: 'Du har forladt teamet' });
    }
    catch (err) {
        console.error('Leave team error:', err);
        res.status(500).json({ error: 'Server fejl' });
    }
});
exports.default = router;
