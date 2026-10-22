import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as dashboardController from './dashboard.controller';

const router = Router();

// Any authenticated user can view the dashboard — it's a read-only
// aggregate with no mutating actions, so there is no role restriction
// here (unlike the create/update/delete routes in every other module).
router.use(authenticate);
router.get('/', dashboardController.getSummary);

export default router;
