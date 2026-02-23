import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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

const port = parseInt(process.env.PORT || '3000', 10);
app.listen(port, () => console.log(`Server listening on ${port}`));
