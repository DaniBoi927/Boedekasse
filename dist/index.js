"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fines_1 = __importDefault(require("./routes/fines"));
const auth_1 = __importDefault(require("./routes/auth"));
const teams_1 = __importDefault(require("./routes/teams"));
const league_1 = __importDefault(require("./routes/league"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/api/auth', auth_1.default);
app.use('/api/teams', teams_1.default);
app.use('/api/teams', league_1.default);
app.use('/api/fines', fines_1.default);
app.get('/health', (req, res) => res.json({ ok: true }));
// Serve static files from client build
const clientPath = path_1.default.join(__dirname, '../client/dist');
app.use(express_1.default.static(clientPath));
// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
    res.sendFile(path_1.default.join(clientPath, 'index.html'));
});
const port = parseInt(process.env.PORT || '3000', 10);
app.listen(port, () => console.log(`Server listening on ${port}`));
