import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { isDatabaseConnected } from './db/db';
import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import incubatorsRoutes from './modules/incubators/incubators.routes';
import mediaRoutes from './modules/media/media.routes';
import cellCulturesRoutes from './modules/cellCultures/cellCultures.routes';
import cultureSchedulesRoutes from './modules/cultureSchedules/cultureSchedules.routes';
import contaminationLogsRoutes from './modules/contaminationLogs/contaminationLogs.routes';
import experimentsRoutes from './modules/experiments/experiments.routes';
import observationsRoutes from './modules/experiments/observations.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';

const app: Application = express();

app.use(cors());
app.use(express.json());

/**
 * Health check endpoint.
 * Confirms the backend process is up AND that it can reach MongoDB.
 * Redis connectivity is not checked yet — that will be added once a
 * Redis-backed feature (e.g. auth sessions) is implemented.
 */
app.get('/health', async (_req: Request, res: Response) => {
  const health: {
    status: 'ok' | 'degraded';
    service: string;
    timestamp: string;
    database: 'connected' | 'unavailable';
  } = {
    status: 'ok',
    service: 'cell-culture-backend',
    timestamp: new Date().toISOString(),
    database: 'unavailable',
  };

  try {
    if (!isDatabaseConnected()) throw new Error('MongoDB is not connected');
    health.database = 'connected';
    res.status(200).json(health);
  } catch (err) {
    health.status = 'degraded';
    health.database = 'unavailable';
    res.status(503).json(health);
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/incubators', incubatorsRoutes);
app.use('/api/media-batches', mediaRoutes);
app.use('/api/cell-cultures', cellCulturesRoutes);
app.use('/api/culture-schedules', cultureSchedulesRoutes);
app.use('/api/contamination-logs', contaminationLogsRoutes);
app.use('/api/experiments', experimentsRoutes);
app.use('/api/observations', observationsRoutes);
app.use('/api/dashboard', dashboardRoutes);

export default app;
