// import express, { type Express } from 'express';
// import cors from 'cors';
// import dotenv from 'dotenv';
// import routes from './routes';

// // Load environment variables
// dotenv.config();

// const app: Express = express();

// // Middleware
// app.use(cors({
//   origin: process.env.FRONTEND_URL || 'http://localhost:3000',
//   credentials: true
// }));
// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true }));

// // Request logging middleware
// app.use((req, res, next) => {
//   if (process.env.NODE_ENV !== 'test') {
//     console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
//   }
//   next();
// });

// // API Routes
// app.use('/api', routes);

// // WebSocket status endpoint (mock for testing)
// app.get('/api/websocket/status', (req, res) => {
//   res.json({
//     success: true,
//     data: {
//       totalConnections: 0,
//       activeConnections: 0,
//       authenticatedConnections: 0,
//       uniqueUsers: 0,
//       serverTime: new Date().toISOString(),
//       uptime: process.uptime()
//     }
//   });
// });

// // Error handling middleware
// app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
//   console.error('Error:', err);
//   res.status(500).json({
//     success: false,
//     error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
//   });
// });

// // 404 handler
// app.use('*', (req, res) => {
//   res.status(404).json({
//     success: false,
//     error: 'Route not found'
//   });
// });

// export default app;