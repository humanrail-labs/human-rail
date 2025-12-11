import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { config } from './config';
import { taskRoutes } from './routes/tasks';
import { paymentRoutes } from './routes/payments';
import { actionsJsonRoute } from './routes/actions-json';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

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
app.use('/actions.json', actionsJsonRoute);
app.use('/actions/tasks', taskRoutes);
app.use('/actions/payments', paymentRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', cluster: config.cluster });
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

app.listen(config.port, () => {
  console.log(`HumanRail Actions Server running on port ${config.port}`);
  console.log(`Cluster: ${config.cluster}`);
  console.log(`RPC: ${config.rpcUrl}`);
});
