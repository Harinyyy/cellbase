import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import * as experimentsController from './experiments.controller';
import * as observationsController from './observations.controller';

const router = Router();

// Every route in this module requires a valid, authenticated user.
router.use(authenticate);

// Viewing: any authenticated user. Creating/updating/deleting: admin only.
router.post('/', requireRole('admin'), experimentsController.create);
router.get('/', experimentsController.list);
router.get('/:id', experimentsController.getOne);
router.put('/:id', requireRole('admin'), experimentsController.update);
router.delete('/:id', requireRole('admin'), experimentsController.remove);

// --- Experiment Observations (nested under an experiment) ---
// Viewing: any authenticated user. Recording: admin only,
// same tier as the experiment itself (unlike incubator readings/passages,
// which any authenticated user can log).
router.post(
  '/:id/observations',
  requireRole('admin'),
  observationsController.createForExperiment,
);
router.get('/:id/observations', observationsController.listForExperiment);

export default router;
