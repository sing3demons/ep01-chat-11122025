import express, { type NextFunction, type Express, type Request, type Response } from 'express';
import cors from 'cors';
import { createServer, Server } from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import routes from './routes';
import { WebSocketManager, WebSocketService } from './websocket';
import pino from 'pino';
import { CustomLogger } from './logger/logger';


import { createStream } from 'rotating-file-stream';

const logStream = createStream(
  (time) => {
    if (!time || typeof time === 'number') return 'app.log';
    return `app-${time.toISOString().slice(0, 10)}.log`;
  },
  {
    path: 'logs',
    interval: '1d',
    maxFiles: 14,
  }
);


const logger = pino(
  {
    level: 'debug',
    timestamp: false,
    base: undefined,
  },
  logStream
);


// Load environment variables
dotenv.config();
const app: Express = express();

async function main() {
  const server = createServer(app);
  const wss = new WebSocketServer({ server });
  const customLogger = new CustomLogger({
    service: process.env.SERVICE_NAME || 'ep01-chat-backend',
    version: process.env.VERSION || '1.0.0'
  }, {
    transport: logger
  });
  // Initialize WebSocket management
  const wsManager = new WebSocketManager(wss, customLogger);
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
  // app.use((req, _res, next) => {
  //   console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  //   next();
  // });

  // initialize logger middleware
  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.logger = customLogger;
    next();
  });

  // Make WebSocket service available to routes
  app.locals.wsService = wsService;

  // API Routes
  app.use('/api', routes(customLogger));

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
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  });

  // 404 handler
  app.use('*', (_req, res) => {
    res.status(404).json({
      success: false,
      error: 'Route not found'
    });
  });

  const PORT = process.env.PORT || 3001;

  server.listen(PORT);

  const shutdown = createShutdown(server, [
    { name: 'WebSocket', close: () => wsService.cleanup() },
  ]);
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📡 WebSocket server is ready`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
}



// Graceful shutdown
// process.on('SIGTERM', () => {
//   console.log('SIGTERM received, shutting down gracefully');

//   // Cleanup WebSocket connections
//   wsService.cleanup();

//   server.close(() => {
//     console.log('Server closed');
//     process.exit(0);
//   });
// });

// process.on('SIGINT', () => {
//   console.log('SIGINT received, shutting down gracefully');

//   // Cleanup WebSocket connections
//   wsService.cleanup();

//   server.close(() => {
//     console.log('Server closed');
//     process.exit(0);
//   });
// });

main().catch((err) => {
  console.error('Fatal error during server initialization:', err);
  process.exit(1);
});


interface CleanupResource {
  name: string;
  close: () => Promise<void> | void;
}

export function createShutdown(
  server: Server,
  resources: CleanupResource[] = [],
  delay: number = 10000
) {
  return async function shutdown(signal: string) {
    console.log(`\n[SHUTDOWN] Received ${signal}. Shutting down gracefully...`);

    // 1. Stop accepting new connections
    const closeServer = new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) {
          console.error('[SHUTDOWN] Server close error:', err);
          return reject(err);
        }
        console.log('[SHUTDOWN] HTTP server closed.');
        resolve();
      });
    });

    // 2. Close external resources (DB / Redis / etc.)
    const closeResources = Promise.all(
      resources.map(async (r) => {
        try {
          console.log(`[SHUTDOWN] Closing ${r.name}...`);
          await r.close();
          console.log(`[SHUTDOWN] ${r.name} closed.`);
        } catch (err) {
          console.error(`[SHUTDOWN] Failed to close ${r.name}:`, err);
        }
      })
    );

    // 3. Timeout fallback (force exit)
    const forceExit = new Promise((_res, reject) => {
      setTimeout(() => {
        reject(new Error('Shutdown timeout, forcing exit.'));
      }, delay).unref();
    });

    try {
      await Promise.race([Promise.all([closeServer, closeResources]), forceExit]);
      console.log('[SHUTDOWN] Graceful shutdown complete.');
      process.exit(0);
    } catch (err) {
      console.error('[SHUTDOWN] Forced shutdown:', err);
      process.exit(1);
    }
  };
}

export default app;