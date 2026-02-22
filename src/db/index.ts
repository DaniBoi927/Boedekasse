import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();

import type { Fine } from '../models/fine';

const config: sql.config = {
  user: process.env.AZURE_DB_USER as string,
  password: process.env.AZURE_DB_PASSWORD as string,
  server: process.env.AZURE_DB_HOST as string,
  database: process.env.AZURE_DB_NAME as string,
  port: parseInt(process.env.AZURE_DB_PORT || '1433', 10),
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  options: { encrypt: true, trustServerCertificate: false }
};

export async function getPool(): Promise<sql.ConnectionPool> {
  return await sql.connect(config);
}

export default sql;

export async function insertFine(input: { payer: string; amount: number; reason?: string | null }): Promise<Fine> {
  const pool = await getPool();
  const result = await pool.request()
    .input('payer', sql.NVarChar, input.payer)
    .input('amount', sql.Decimal(10, 2), input.amount)
    .input('reason', sql.NVarChar, input.reason || null)
    .query(`INSERT INTO fines (payer, amount, reason) OUTPUT INSERTED.* VALUES (@payer, @amount, @reason)`);
  return result.recordset[0];
}

export async function listFines(filters?: { paid?: boolean; payer?: string }): Promise<Fine[]> {
  const pool = await getPool();
  let q = 'SELECT * FROM fines';
  const where: string[] = [];
  if (filters?.paid !== undefined) {
    where.push('paid = @paid');
  }
  if (filters?.payer) {
    where.push('payer = @payer');
  }
  if (where.length) q += ' WHERE ' + where.join(' AND ');
  q += ' ORDER BY created_at DESC';
  const req = pool.request();
  if (filters?.paid !== undefined) req.input('paid', filters.paid ? 1 : 0);
  if (filters?.payer) req.input('payer', filters.payer);
  const result = await req.query(q);
  return result.recordset;
}

export async function getFineById(id: number): Promise<Fine | null> {
  const pool = await getPool();
  const result = await pool.request().input('id', id).query('SELECT * FROM fines WHERE id = @id');
  return result.recordset[0] || null;
}

export async function updateFine(id: number, fields: Partial<Fine>): Promise<Fine | null> {
  const pool = await getPool();
  const result = await pool.request()
    .input('id', id)
    .input('payer', fields.payer || null)
    .input('amount', fields.amount ?? null)
    .input('reason', fields.reason ?? null)
    .input('paid', fields.paid !== undefined ? (fields.paid ? 1 : 0) : null)
    .query(`UPDATE fines SET payer = COALESCE(@payer, payer), amount = COALESCE(@amount, amount), reason = COALESCE(@reason, reason), paid = COALESCE(@paid, paid) WHERE id = @id; SELECT * FROM fines WHERE id = @id;`);
  return result.recordset[0] || null;
}

export async function payFine(id: number, paid_by?: string | null): Promise<Fine | null> {
  const pool = await getPool();
  const result = await pool.request()
    .input('id', id)
    .input('paid_by', paid_by || null)
    .query(`UPDATE fines SET paid = 1, paid_by = @paid_by, paid_at = SYSDATETIMEOFFSET() WHERE id = @id; SELECT * FROM fines WHERE id = @id;`);
  return result.recordset[0] || null;
}

export async function getTotals(): Promise<Array<{ payer: string; outstanding: number; total: number }>> {
  const pool = await getPool();
  const result = await pool.request().query(`SELECT payer, SUM(CASE WHEN paid=0 THEN amount ELSE 0 END) AS outstanding, SUM(amount) AS total FROM fines GROUP BY payer`);
  return result.recordset;
}
