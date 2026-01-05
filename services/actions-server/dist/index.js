"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const config_1 = require("./config");
const tasks_1 = require("./routes/tasks");
const payments_1 = require("./routes/payments");
const actions_json_1 = require("./routes/actions-json");
dotenv_1.default.config();
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Solana Actions requires specific headers
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept-Encoding');
    res.setHeader('Access-Control-Expose-Headers', 'X-Action-Version, X-Blockchain-Ids');
    res.setHeader('X-Action-Version', '2.1.3');
    res.setHeader('X-Blockchain-Ids', 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'); // mainnet
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});
// Routes
app.use('/actions.json', actions_json_1.actionsJsonRoute);
app.use('/actions/tasks', tasks_1.taskRoutes);
app.use('/actions/payments', payments_1.paymentRoutes);
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', cluster: config_1.config.cluster });
});
// Root info
app.get('/', (req, res) => {
    res.json({
        name: 'HumanRail Actions Server',
        version: '0.1.0',
        endpoints: {
            tasks: '/actions/tasks/:taskPubkey',
            payments: '/actions/payments/:invoicePubkey',
            actionsJson: '/actions.json',
        },
    });
});
app.listen(config_1.config.port, () => {
    console.log(`HumanRail Actions Server running on port ${config_1.config.port}`);
    console.log(`Cluster: ${config_1.config.cluster}`);
    console.log(`RPC: ${config_1.config.rpcUrl}`);
});
