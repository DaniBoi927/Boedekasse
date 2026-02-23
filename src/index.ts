import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import finesRouter from './routes/fines';
import authRouter from './routes/auth';
import teamsRouter from './routes/teams';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/fines', finesRouter);

app.get('/health', (req, res) => res.json({ ok: true }));

// Serve static files from client build
const clientPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientPath));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

const port = parseInt(process.env.PORT || '3000', 10);
app.listen(port, () => console.log(`Server listening on ${port}`));
