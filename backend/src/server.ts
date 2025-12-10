import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import routes from './routes';
import { WebSocketManager, WebSocketService } from './websocket';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Initialize WebSocket management
const wsManager = new WebSocketManager(wss);
const wsService = WebSocketService.getInstance();
wsService.initialize(wsManager);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Make WebSocket service available to routes
app.locals.wsService = wsService;

// API Routes
app.use('/api', routes);

// WebSocket status endpoint
app.get('/api/websocket/status', (req, res) => {
  const stats = wsService.getConnectionStats();
  res.json({
    success: true,
    data: {
      ...stats,
      serverTime: new Date().toISOString(),
      uptime: process.uptime()
    }
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📡 WebSocket server is ready`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  // Cleanup WebSocket connections
  wsService.cleanup();
  
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  
  // Cleanup WebSocket connections
  wsService.cleanup();
  
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;