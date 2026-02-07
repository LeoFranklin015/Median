import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { webSocketService } from './lib/websockets';
import { createChannelOnChain } from './utils/channel/create';
import { closeChannelOnChain } from './utils/channel/close';
import { resizeChannelOnChain } from './utils/channel/resize';
import { depositToCustody } from './utils/channel/deposit';
import { withdrawFromCustody } from './utils/channel/withdraw';
import { createAppSession } from './utils/session/create';
import { submitAppState } from './utils/session/submitState';
import { closeAppSession } from './utils/session/close';
import { transfer } from './utils/session/transfer';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

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

import { privateKeyToAccount } from 'viem/accounts';

// ...

app.get('/ws/status', (req: Request, res: Response) => {
  let privateKey = process.env.PRIVATE_KEY as string || '';
  if (privateKey && !privateKey.startsWith('0x')) {
    privateKey = `0x${privateKey}`;
  }
  const wallet = privateKey ? privateKeyToAccount(privateKey as `0x${string}`) : null;

  res.json({
    status: webSocketService.getStatus(),
    authenticated: webSocketService.isAuthenticated(),
    sessionKey: webSocketService.getSessionKey()?.address || null,
    walletAddress: wallet?.address || null
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

app.post('/channels/close', async (req: Request, res: Response) => {
  try {
    const { channelId } = req.body;
    if (!channelId || !channelId.startsWith('0x')) {
      res.status(400).json({ success: false, error: 'Invalid channelId. Provide a hex string starting with 0x.' });
      return;
    }
    const result = await closeChannelOnChain(channelId);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Failed to close channel:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/channels/resize', async (req: Request, res: Response) => {
  try {
    const { channelId, resizeAmount, allocateAmount } = req.body;
    if (!channelId || !channelId.startsWith('0x')) {
      res.status(400).json({ success: false, error: 'Invalid channelId. Provide a hex string starting with 0x.' });
      return;
    }
    if (resizeAmount === undefined && allocateAmount === undefined) {
      res.status(400).json({ success: false, error: 'At least one of resizeAmount or allocateAmount must be provided.' });
      return;
    }
    const result = await resizeChannelOnChain(channelId, resizeAmount, allocateAmount);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Failed to resize channel:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/deposit', async (req: Request, res: Response) => {
  try {
    const { amount } = req.body;
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      res.status(400).json({ success: false, error: 'Invalid amount. Provide a positive number.' });
      return;
    }
    const txHash = await depositToCustody(amount.toString());
    res.json({ success: true, txHash });
  } catch (error) {
    console.error('Failed to deposit:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/withdraw', async (req: Request, res: Response) => {
  try {
    const { amount } = req.body;
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      res.status(400).json({ success: false, error: 'Invalid amount. Provide a positive number.' });
      return;
    }
    const txHash = await withdrawFromCustody(amount.toString());
    res.json({ success: true, txHash });
  } catch (error) {
    console.error('Failed to withdraw:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ==================== App Session Endpoints ====================

app.post('/sessions', async (req: Request, res: Response) => {
  try {
    const { participants, allocations, applicationName } = req.body;
    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      res.status(400).json({ success: false, error: 'participants array is required.' });
      return;
    }
    if (!allocations || !Array.isArray(allocations) || allocations.length === 0) {
      res.status(400).json({ success: false, error: 'allocations array is required.' });
      return;
    }
    const result = await createAppSession({ participants, allocations, applicationName });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Failed to create app session:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/sessions/:id/state', async (req: Request, res: Response) => {
  try {
    const appSessionId = req.params.id;
    const { allocations, sessionData, intent } = req.body;
    if (!appSessionId.startsWith('0x')) {
      res.status(400).json({ success: false, error: 'Invalid appSessionId. Provide a hex string starting with 0x.' });
      return;
    }
    if (!allocations || !Array.isArray(allocations) || allocations.length === 0) {
      res.status(400).json({ success: false, error: 'allocations array is required.' });
      return;
    }
    if (intent && !['operate', 'deposit', 'withdraw'].includes(intent)) {
      res.status(400).json({ success: false, error: 'Invalid intent. Use: operate, deposit, or withdraw.' });
      return;
    }
    const result = await submitAppState({ appSessionId, allocations, sessionData, intent });
    res.json(result);
  } catch (error) {
    console.error('Failed to submit app state:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/sessions/:id/close', async (req: Request, res: Response) => {
  try {
    const appSessionId = req.params.id;
    const { allocations } = req.body;
    if (!appSessionId.startsWith('0x')) {
      res.status(400).json({ success: false, error: 'Invalid appSessionId. Provide a hex string starting with 0x.' });
      return;
    }
    if (!allocations || !Array.isArray(allocations) || allocations.length === 0) {
      res.status(400).json({ success: false, error: 'allocations array is required.' });
      return;
    }
    const result = await closeAppSession({ appSessionId, allocations });
    res.json(result);
  } catch (error) {
    console.error('Failed to close app session:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/transfer', async (req: Request, res: Response) => {
  try {
    const { destination, allocations } = req.body;
    if (!destination || !destination.startsWith('0x')) {
      res.status(400).json({ success: false, error: 'Invalid destination. Provide a hex address starting with 0x.' });
      return;
    }
    if (!allocations || !Array.isArray(allocations) || allocations.length === 0) {
      res.status(400).json({ success: false, error: 'allocations array is required (e.g., [{ asset: "usdc", amount: "0.001" }]).' });
      return;
    }
    const result = await transfer({ destination, allocations });
    res.json(result);
  } catch (error) {
    console.error('Failed to transfer:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Bind to 0.0.0.0 for Render deployment
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
  console.log('WebSocket service will connect automatically...');
});
