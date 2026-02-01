import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { webSocketService } from './lib/websockets';
import { createChannelOnChain } from './utils/channel/create';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to the API' });
});

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    websocket: webSocketService.getStatus(),
    authenticated: webSocketService.isAuthenticated(),
  });
});

app.get('/ws/status', (req: Request, res: Response) => {
  res.json({
    status: webSocketService.getStatus(),
    authenticated: webSocketService.isAuthenticated(),
    sessionKey: webSocketService.getSessionKey()?.address || null,
  });
});


app.post('/channels/onchain', async (req: Request, res: Response) => {
  try {
    const result = await createChannelOnChain();
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Failed to create channel on-chain:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log('WebSocket service will connect automatically...');
});
