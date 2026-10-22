import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import * as scheduleController from './cultureSchedules.controller';

const router = Router();

// Every route in this module requires a valid, authenticated user.
router.use(authenticate);

// Viewing: any authenticated user. Creating/updating/deleting: admin only.
// This also means only admins can ever set or change
// assigned_to, so a researcher cannot reassign tasks to themselves or
// others by any route.
router.post('/', requireRole('admin'), scheduleController.create);
router.get('/', scheduleController.list);
router.get('/:id', scheduleController.getOne);
router.put('/:id', requireRole('admin'), scheduleController.update);
router.delete('/:id', requireRole('admin'), scheduleController.remove);

export default router;
