import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import * as incubatorsController from './incubators.controller';
import * as readingsController from './readings.controller';

const router = Router();

// Every route in this module requires a valid, authenticated user.
router.use(authenticate);

// --- Incubator CRUD ---
// Viewing: any authenticated user. Creating/updating/deleting: admin only.
router.post('/', requireRole('admin'), incubatorsController.create);
router.get('/', incubatorsController.list);
router.get('/:id', incubatorsController.getOne);
router.put('/:id', requireRole('admin'), incubatorsController.update);
router.delete('/:id', requireRole('admin'), incubatorsController.remove);

// --- Incubator readings (nested under an incubator) ---
// Recording and viewing readings: any authenticated user (per module scope).
router.post('/:id/readings', readingsController.create);
router.get('/:id/readings', readingsController.list);

export default router;
