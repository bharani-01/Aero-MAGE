import express from 'express';
import cors from 'cors';

// Global patch to serialize BigInt as string in Express responses (Prisma BigInt compatibility)
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};
import apiRouter from './api/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { AppError } from './shared/errors/AppError.js';
import { auditMiddleware } from './middleware/auditMiddleware.js';
import { inputValidationMiddleware } from './middleware/inputValidation.js';
import { getMaintenanceMode } from './services/systemState.js';

const app = express();

// Standard middleware stack
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(inputValidationMiddleware);
app.use(auditMiddleware);

// Mount central API router under /api
app.use('/api', apiRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});

// Public system status endpoint (maintenance mode check)
app.get('/api/system/status', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      maintenance_mode: getMaintenanceMode(),
      timestamp: new Date().toISOString()
    }
  });
});

// Fallback Route Handler (404)
app.use('*', (req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404, 'ROUTE_NOT_FOUND'));
});

// Global Error Handler Middleware
app.use(errorHandler);

export default app;
