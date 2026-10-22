import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import * as observationsController from './observations.controller';

const router = Router();

// Every route in this module requires a valid, authenticated user.
router.use(authenticate);

// Viewing: any authenticated user. Updating/deleting: admin only.
router.get('/:id', observationsController.getOne);
router.put('/:id', requireRole('admin'), observationsController.update);
router.delete('/:id', requireRole('admin'), observationsController.remove);

export default router;
