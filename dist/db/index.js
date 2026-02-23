"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPool = getPool;
exports.insertFine = insertFine;
exports.listFines = listFines;
exports.getFineById = getFineById;
exports.updateFine = updateFine;
exports.payFine = payFine;
exports.getTotals = getTotals;
const mssql_1 = __importDefault(require("mssql"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const config = {
    user: process.env.AZURE_DB_USER,
    password: process.env.AZURE_DB_PASSWORD,
    server: process.env.AZURE_DB_HOST,
    database: process.env.AZURE_DB_NAME,
    port: parseInt(process.env.AZURE_DB_PORT || '1433', 10),
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    options: { encrypt: true, trustServerCertificate: false }
};
async function getPool() {
    return await mssql_1.default.connect(config);
}
exports.default = mssql_1.default;
async function insertFine(input) {
    const pool = await getPool();
    const result = await pool.request()
        .input('payer', mssql_1.default.NVarChar, input.payer)
        .input('amount', mssql_1.default.Decimal(10, 2), input.amount)
        .input('reason', mssql_1.default.NVarChar, input.reason || null)
        .query(`INSERT INTO fines (payer, amount, reason) OUTPUT INSERTED.* VALUES (@payer, @amount, @reason)`);
    return result.recordset[0];
}
async function listFines(filters) {
    const pool = await getPool();
    let q = 'SELECT * FROM fines';
    const where = [];
    if (filters?.paid !== undefined) {
        where.push('paid = @paid');
    }
    if (filters?.payer) {
        where.push('payer = @payer');
    }
    if (where.length)
        q += ' WHERE ' + where.join(' AND ');
    q += ' ORDER BY created_at DESC';
    const req = pool.request();
    if (filters?.paid !== undefined)
        req.input('paid', filters.paid ? 1 : 0);
    if (filters?.payer)
        req.input('payer', filters.payer);
    const result = await req.query(q);
    return result.recordset;
}
async function getFineById(id) {
    const pool = await getPool();
    const result = await pool.request().input('id', id).query('SELECT * FROM fines WHERE id = @id');
    return result.recordset[0] || null;
}
async function updateFine(id, fields) {
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
async function payFine(id, paid_by) {
    const pool = await getPool();
    const result = await pool.request()
        .input('id', id)
        .input('paid_by', paid_by || null)
        .query(`UPDATE fines SET paid = 1, paid_by = @paid_by, paid_at = SYSDATETIMEOFFSET() WHERE id = @id; SELECT * FROM fines WHERE id = @id;`);
    return result.recordset[0] || null;
}
async function getTotals() {
    const pool = await getPool();
    const result = await pool.request().query(`SELECT payer, SUM(CASE WHEN paid=0 THEN amount ELSE 0 END) AS outstanding, SUM(amount) AS total FROM fines GROUP BY payer`);
    return result.recordset;
}
