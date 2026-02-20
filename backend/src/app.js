const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const healthRouter = require('./routes/health');
const transactionsRouter = require('./routes/transactions');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));
app.use(express.json());

app.use('/api/health', healthRouter);
app.use('/api/transactions', transactionsRouter);

module.exports = app;
