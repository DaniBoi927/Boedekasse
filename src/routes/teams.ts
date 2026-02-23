import { Router } from 'express';
import { getPool } from '../db';
import { authMiddleware } from './auth';
import crypto from 'crypto';

const router = Router();

// Generate invite code
function generateInviteCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// Create team
router.post('/', authMiddleware, async (req: any, res) => {
  const { name, mobilepay_link } = req.body;
  const userId = req.userId;

  if (!name || name.trim().length < 2) {
    return res.status(400).json({ error: 'Team navn skal være mindst 2 tegn' });
  }

  try {
    const pool = await getPool();
    const invite_code = generateInviteCode();

    // Create team
    const teamResult = await pool.request()
      .input('name', name.trim())
      .input('invite_code', invite_code)
      .input('created_by', userId)
      .input('mobilepay_link', mobilepay_link || null)
      .query(`
        INSERT INTO teams (name, invite_code, created_by, mobilepay_link) 
        OUTPUT INSERTED.* 
        VALUES (@name, @invite_code, @created_by, @mobilepay_link)
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
  } catch (err) {
    console.error('Create team error:', err);
    res.status(500).json({ error: 'Server fejl' });
  }
});

// Get my teams
router.get('/my', authMiddleware, async (req: any, res) => {
  const userId = req.userId;

  try {
    const pool = await getPool();
    
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
  } catch (err) {
    console.error('Get teams error:', err);
    res.status(500).json({ error: 'Server fejl' });
  }
});

// Get team by id
router.get('/:id', authMiddleware, async (req: any, res) => {
  const { id } = req.params;
  const userId = req.userId;

  try {
    const pool = await getPool();

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
  } catch (err) {
    console.error('Get team error:', err);
    res.status(500).json({ error: 'Server fejl' });
  }
});

// Get team members
router.get('/:id/members', authMiddleware, async (req: any, res) => {
  const { id } = req.params;
  const userId = req.userId;

  try {
    const pool = await getPool();

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
  } catch (err) {
    console.error('Get members error:', err);
    res.status(500).json({ error: 'Server fejl' });
  }
});

// Join team with invite code
router.post('/join', authMiddleware, async (req: any, res) => {
  const { invite_code } = req.body;
  const userId = req.userId;

  if (!invite_code) {
    return res.status(400).json({ error: 'Invitationskode er påkrævet' });
  }

  try {
    const pool = await getPool();

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
  } catch (err) {
    console.error('Join team error:', err);
    res.status(500).json({ error: 'Server fejl' });
  }
});

// Update member role (only formand can do this)
router.put('/:id/members/:memberId/role', authMiddleware, async (req: any, res) => {
  const { id, memberId } = req.params;
  const { role } = req.body;
  const userId = req.userId;

  if (!role || !['formand', 'member'].includes(role)) {
    return res.status(400).json({ error: 'Ugyldig rolle' });
  }

  try {
    const pool = await getPool();

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
  } catch (err) {
    console.error('Update role error:', err);
    res.status(500).json({ error: 'Server fejl' });
  }
});

// Leave team
router.delete('/:id/leave', authMiddleware, async (req: any, res) => {
  const { id } = req.params;
  const userId = req.userId;

  try {
    const pool = await getPool();

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
  } catch (err) {
    console.error('Leave team error:', err);
    res.status(500).json({ error: 'Server fejl' });
  }
});

// Update team settings (only formand)
router.put('/:id', authMiddleware, async (req: any, res) => {
  const { id } = req.params;
  const { mobilepay_link } = req.body;
  const userId = req.userId;

  try {
    const pool = await getPool();

    // Check if requester is formand
    const formandCheck = await pool.request()
      .input('team_id', id)
      .input('user_id', userId)
      .query('SELECT role FROM team_members WHERE team_id = @team_id AND user_id = @user_id');

    if (formandCheck.recordset.length === 0 || formandCheck.recordset[0].role !== 'formand') {
      return res.status(403).json({ error: 'Kun formanden kan ændre team indstillinger' });
    }

    // Update team
    await pool.request()
      .input('id', id)
      .input('mobilepay_link', mobilepay_link || null)
      .query('UPDATE teams SET mobilepay_link = @mobilepay_link WHERE id = @id');

    res.json({ message: 'Team opdateret' });
  } catch (err) {
    console.error('Update team error:', err);
    res.status(500).json({ error: 'Server fejl' });
  }
});

// Delete team (only creator/formand)
router.delete('/:id', authMiddleware, async (req: any, res) => {
  const { id } = req.params;
  const userId = req.userId;

  try {
    const pool = await getPool();

    // Check if requester is formand
    const formandCheck = await pool.request()
      .input('team_id', id)
      .input('user_id', userId)
      .query('SELECT role FROM team_members WHERE team_id = @team_id AND user_id = @user_id');

    if (formandCheck.recordset.length === 0 || formandCheck.recordset[0].role !== 'formand') {
      return res.status(403).json({ error: 'Kun formanden kan slette teamet' });
    }

    // Delete all related data first
    await pool.request()
      .input('team_id', id)
      .query('DELETE FROM fines WHERE team_id = @team_id');
    
    await pool.request()
      .input('team_id', id)
      .query('DELETE FROM fine_types WHERE team_id = @team_id');
    
    await pool.request()
      .input('team_id', id)
      .query('DELETE FROM team_members WHERE team_id = @team_id');
    
    await pool.request()
      .input('id', id)
      .query('DELETE FROM teams WHERE id = @id');

    res.json({ message: 'Team slettet' });
  } catch (err) {
    console.error('Delete team error:', err);
    res.status(500).json({ error: 'Server fejl' });
  }
});

export default router;
