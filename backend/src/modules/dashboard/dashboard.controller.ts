import { Request, Response } from 'express';
import { getDashboard, DashboardError } from './dashboard.service';

export async function getSummary(_req: Request, res: Response): Promise<void> {
  try {
    const dashboard = await getDashboard();
    res.status(200).json({ dashboard });
  } catch (err) {
    if (err instanceof DashboardError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    console.error('Unexpected dashboard error:', err);
    res.status(500).json({ error: 'An unexpected error occurred' });
  }
}
