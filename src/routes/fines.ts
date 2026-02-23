import { Router } from 'express';
import { getPool } from '../db';
import { authMiddleware } from './auth';

const router = Router();

// Helper: Check if user is formand in team
async function isFormand(pool: any, teamId: number, userId: number): Promise<boolean> {
  const result = await pool.request()
    .input('team_id', teamId)
    .input('user_id', userId)
    .query(`SELECT role FROM team_members WHERE team_id = @team_id AND user_id = @user_id`);
  return result.recordset.length > 0 && result.recordset[0].role === 'formand';
}

// Helper: Check if user is member of team
async function isMember(pool: any, teamId: number, userId: number): Promise<boolean> {
  const result = await pool.request()
    .input('team_id', teamId)
    .input('user_id', userId)
    .query(`SELECT id FROM team_members WHERE team_id = @team_id AND user_id = @user_id`);
  return result.recordset.length > 0;
}

// ==================== FINE TYPES ====================

// Get all fine types for a team
router.get('/types/team/:teamId', authMiddleware, async (req: any, res) => {
  const { teamId } = req.params;
  const userId = req.userId;

  try {
    const pool = await getPool();

    if (!(await isMember(pool, parseInt(teamId), userId))) {
      return res.status(403).json({ error: 'Du er ikke medlem af dette team' });
    }

    const result = await pool.request()
      .input('team_id', teamId)
      .query(`
        SELECT ft.*, u.name as created_by_name 
        FROM fine_types ft 
        LEFT JOIN users u ON ft.created_by = u.id
        WHERE ft.team_id = @team_id 
        ORDER BY ft.reason ASC
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server fejl' });
  }
});

// Create fine type (any team member)
router.post('/types', authMiddleware, async (req: any, res) => {
  const { team_id, reason, amount } = req.body;
  const userId = req.userId;

  if (!team_id || !reason || amount == null) {
    return res.status(400).json({ error: 'Team, årsag og beløb er påkrævet' });
  }

  try {
    const pool = await getPool();

    // Check if user is member of team
    if (!(await isMember(pool, team_id, userId))) {
      return res.status(403).json({ error: 'Du er ikke medlem af dette team' });
    }

    const result = await pool.request()
      .input('team_id', team_id)
      .input('reason', reason.trim())
      .input('amount', amount)
      .input('created_by', userId)
      .query(`
        INSERT INTO fine_types (team_id, reason, amount, created_by)
        OUTPUT INSERTED.*
        VALUES (@team_id, @reason, @amount, @created_by)
      `);

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server fejl' });
  }
});

// Update fine type (only formand)
router.put('/types/:id', authMiddleware, async (req: any, res) => {
  const { id } = req.params;
  const { reason, amount } = req.body;
  const userId = req.userId;

  try {
    const pool = await getPool();

    // Get the fine type to check team
    const fineType = await pool.request()
      .input('id', id)
      .query('SELECT * FROM fine_types WHERE id = @id');

    if (!fineType.recordset.length) {
      return res.status(404).json({ error: 'Bødetype ikke fundet' });
    }

    const teamId = fineType.recordset[0].team_id;

    if (!(await isFormand(pool, teamId, userId))) {
      return res.status(403).json({ error: 'Kun formanden kan redigere bødetyper' });
    }

    const result = await pool.request()
      .input('id', id)
      .input('reason', reason?.trim() || fineType.recordset[0].reason)
      .input('amount', amount ?? fineType.recordset[0].amount)
      .query(`
        UPDATE fine_types 
        SET reason = @reason, amount = @amount
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server fejl' });
  }
});

// Delete fine type (only formand)
router.delete('/types/:id', authMiddleware, async (req: any, res) => {
  const { id } = req.params;
  const userId = req.userId;

  try {
    const pool = await getPool();

    const fineType = await pool.request()
      .input('id', id)
      .query('SELECT * FROM fine_types WHERE id = @id');

    if (!fineType.recordset.length) {
      return res.status(404).json({ error: 'Bødetype ikke fundet' });
    }

    const teamId = fineType.recordset[0].team_id;

    if (!(await isFormand(pool, teamId, userId))) {
      return res.status(403).json({ error: 'Kun formanden kan slette bødetyper' });
    }

    await pool.request()
      .input('id', id)
      .query('DELETE FROM fine_types WHERE id = @id');

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server fejl' });
  }
});

// ==================== FINES ====================

// Create fine (only formand)
router.post('/', authMiddleware, async (req: any, res) => {
  const { payer, amount, reason, team_id } = req.body;
  const userId = req.userId;

  if (!payer || amount == null || !team_id) {
    return res.status(400).json({ error: 'Spiller, beløb og team er påkrævet' });
  }

  try {
    const pool = await getPool();

    // Check if user is formand
    if (!(await isFormand(pool, team_id, userId))) {
      return res.status(403).json({ error: 'Kun formanden kan give bøder' });
    }

    const result = await pool.request()
      .input('payer', payer)
      .input('amount', amount)
      .input('reason', reason || null)
      .input('team_id', team_id)
      .input('created_by', userId)
      .query(`
        INSERT INTO fines (payer, amount, reason, team_id, created_by) 
        OUTPUT INSERTED.* 
        VALUES (@payer, @amount, @reason, @team_id, @created_by)
      `);

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server fejl' });
  }
});

// List fines for a team
router.get('/team/:teamId', authMiddleware, async (req: any, res) => {
  const { teamId } = req.params;
  const { paid, payer } = req.query;
  const userId = req.userId;

  try {
    const pool = await getPool();

    // Check membership
    if (!(await isMember(pool, parseInt(teamId), userId))) {
      return res.status(403).json({ error: 'Du er ikke medlem af dette team' });
    }

    let q = 'SELECT f.*, u.name as created_by_name FROM fines f LEFT JOIN users u ON f.created_by = u.id WHERE f.team_id = @team_id';
    const inputs: Array<{ name: string; value: any }> = [{ name: 'team_id', value: teamId }];

    if (paid !== undefined) {
      q += ' AND f.paid = @paid';
      inputs.push({ name: 'paid', value: paid === 'true' ? 1 : 0 });
    }
    if (payer) {
      q += ' AND f.payer = @payer';
      inputs.push({ name: 'payer', value: payer });
    }
    q += ' ORDER BY f.created_at DESC';

    const reqp = pool.request();
    inputs.forEach(i => reqp.input(i.name, i.value));
    const result = await reqp.query(q);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server fejl' });
  }
});

// Get team totals
router.get('/team/:teamId/totals', authMiddleware, async (req: any, res) => {
  const { teamId } = req.params;
  const userId = req.userId;

  try {
    const pool = await getPool();

    // Check membership
    if (!(await isMember(pool, parseInt(teamId), userId))) {
      return res.status(403).json({ error: 'Du er ikke medlem af dette team' });
    }

    const result = await pool.request()
      .input('team_id', teamId)
      .query(`
        SELECT payer, 
          SUM(CASE WHEN paid=0 THEN amount ELSE 0 END) AS outstanding, 
          SUM(amount) AS total 
        FROM fines 
        WHERE team_id = @team_id
        GROUP BY payer
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server fejl' });
  }
});

// Get unique reasons for a team (for autocomplete)
router.get('/team/:teamId/reasons', authMiddleware, async (req: any, res) => {
  const { teamId } = req.params;
  const userId = req.userId;

  try {
    const pool = await getPool();

    // Check membership
    if (!(await isMember(pool, parseInt(teamId), userId))) {
      return res.status(403).json({ error: 'Du er ikke medlem af dette team' });
    }

    const result = await pool.request()
      .input('team_id', teamId)
      .query(`
        SELECT DISTINCT reason, 
          MAX(amount) as typical_amount,
          COUNT(*) as usage_count
        FROM fines 
        WHERE team_id = @team_id AND reason IS NOT NULL AND reason != ''
        GROUP BY reason
        ORDER BY usage_count DESC
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server fejl' });
  }
});

// Get single fine
router.get('/:id', authMiddleware, async (req: any, res) => {
  const { id } = req.params;
  const userId = req.userId;

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', id)
      .query('SELECT * FROM fines WHERE id = @id');

    if (!result.recordset.length) {
      return res.status(404).json({ error: 'Bøde ikke fundet' });
    }

    const fine = result.recordset[0];

    // Check membership
    if (fine.team_id && !(await isMember(pool, fine.team_id, userId))) {
      return res.status(403).json({ error: 'Du har ikke adgang til denne bøde' });
    }

    res.json(fine);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server fejl' });
  }
});

// Mark fine as paid (only formand)
router.post('/:id/pay', authMiddleware, async (req: any, res) => {
  const { id } = req.params;
  const { paid_by } = req.body;
  const userId = req.userId;

  try {
    const pool = await getPool();

    // Get fine to check team
    const fineResult = await pool.request()
      .input('id', id)
      .query('SELECT * FROM fines WHERE id = @id');

    if (!fineResult.recordset.length) {
      return res.status(404).json({ error: 'Bøde ikke fundet' });
    }

    const fine = fineResult.recordset[0];

    // Check if user is formand
    if (fine.team_id && !(await isFormand(pool, fine.team_id, userId))) {
      return res.status(403).json({ error: 'Kun formanden kan markere bøder som betalt' });
    }

    const result = await pool.request()
      .input('id', id)
      .input('paid_by', paid_by || null)
      .query(`
        UPDATE fines SET paid = 1, paid_by = @paid_by, paid_at = SYSDATETIMEOFFSET() 
        WHERE id = @id; 
        SELECT * FROM fines WHERE id = @id;
      `);

    res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server fejl' });
  }
});

// Delete fine (only formand)
router.delete('/:id', authMiddleware, async (req: any, res) => {
  const { id } = req.params;
  const userId = req.userId;

  try {
    const pool = await getPool();

    // Get fine to check team
    const fineResult = await pool.request()
      .input('id', id)
      .query('SELECT * FROM fines WHERE id = @id');

    if (!fineResult.recordset.length) {
      return res.status(404).json({ error: 'Bøde ikke fundet' });
    }

    const fine = fineResult.recordset[0];

    // Check if user is formand
    if (fine.team_id && !(await isFormand(pool, fine.team_id, userId))) {
      return res.status(403).json({ error: 'Kun formanden kan slette bøder' });
    }

    await pool.request()
      .input('id', id)
      .query('DELETE FROM fines WHERE id = @id');

    res.json({ message: 'Bøde slettet' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server fejl' });
  }
});

export default router;
