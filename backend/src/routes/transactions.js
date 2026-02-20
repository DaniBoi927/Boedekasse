const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/transactions
router.get('/', async (_req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM transactions ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/transactions
router.post('/', async (req, res) => {
  const { description, amount, type } = req.body;
  if (!description || typeof amount !== 'number' || amount <= 0 || !type) {
    return res.status(400).json({ error: 'description is required; amount must be a positive number; type is required' });
  }
  try {
    const { rows } = await db.query(
      'INSERT INTO transactions (description, amount, type) VALUES ($1, $2, $3) RETURNING *',
      [description, amount, type]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/transactions/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM transactions WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
