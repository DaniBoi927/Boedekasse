import { Router } from 'express';
import { getPool } from '../db';
import { Fine } from '../models/fine';

const router = Router();

// create fine
router.post('/', async (req, res) => {
  const { payer, amount, reason } = req.body;
  if (!payer || amount == null) return res.status(400).json({ error: 'payer and amount required' });
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('payer', payer)
      .input('amount', amount)
      .input('reason', reason || null)
      .query(
        `INSERT INTO fines (payer, amount, reason) OUTPUT INSERTED.* VALUES (@payer, @amount, @reason)`
      );
    const inserted = result.recordset[0];
    res.status(201).json(inserted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'db error' });
  }
});

// list fines
router.get('/', async (req, res) => {
  const { paid, payer } = req.query;
  try {
    const pool = await getPool();
    let q = 'SELECT * FROM fines';
    const inputs: Array<{ name: string; value: any }> = [];
    const where: string[] = [];
    if (paid !== undefined) {
      where.push('paid = @paid');
      inputs.push({ name: 'paid', value: paid === 'true' ? 1 : 0 });
    }
    if (payer) {
      where.push('payer = @payer');
      inputs.push({ name: 'payer', value: payer });
    }
    if (where.length) q += ' WHERE ' + where.join(' AND ');
    q += ' ORDER BY created_at DESC';
    const reqp = pool.request();
    inputs.forEach(i => reqp.input(i.name, i.value));
    const result = await reqp.query(q);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'db error' });
  }
});

// stats moved up to avoid being shadowed by '/:id'
router.get('/stats/totals', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(
      `SELECT payer, SUM(CASE WHEN paid=0 THEN amount ELSE 0 END) AS outstanding, SUM(amount) AS total FROM fines GROUP BY payer`
    );
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'db error' });
  }
});

// get fine
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getPool();
    const result = await pool.request().input('id', id).query('SELECT * FROM fines WHERE id = @id');
    if (!result.recordset.length) return res.status(404).json({ error: 'not found' });
    res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'db error' });
  }
});

// update fine
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { payer, amount, reason, paid } = req.body;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', id)
      .input('payer', payer)
      .input('amount', amount)
      .input('reason', reason)
      .input('paid', paid ? 1 : 0)
      .query(
        `UPDATE fines SET payer = COALESCE(@payer, payer), amount = COALESCE(@amount, amount), reason = COALESCE(@reason, reason), paid = COALESCE(@paid, paid) WHERE id = @id; SELECT * FROM fines WHERE id = @id;`
      );
    if (!result.recordset.length) return res.status(404).json({ error: 'not found' });
    res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'db error' });
  }
});

// pay fine
router.post('/:id/pay', async (req, res) => {
  const { id } = req.params;
  const { paid_by } = req.body;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', id)
      .input('paid_by', paid_by || null)
      .query(
        `UPDATE fines SET paid = 1, paid_by = @paid_by, paid_at = SYSDATETIMEOFFSET() WHERE id = @id; SELECT * FROM fines WHERE id = @id;`
      );
    if (!result.recordset.length) return res.status(404).json({ error: 'not found' });
    res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'db error' });
  }
});

export default router;
