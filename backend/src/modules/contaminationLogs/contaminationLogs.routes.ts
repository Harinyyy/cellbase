import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import * as contaminationLogsController from './contaminationLogs.controller';

const router = Router();

// Every route in this module requires a valid, authenticated user.
router.use(authenticate);

// Viewing: any authenticated user. Creating/updating/deleting: admin only.
router.post('/', requireRole('admin'), contaminationLogsController.create);
router.get('/', contaminationLogsController.list);
router.get('/:id', contaminationLogsController.getOne);
router.put('/:id', requireRole('admin'), contaminationLogsController.update);
router.delete('/:id', requireRole('admin'), contaminationLogsController.remove);

export default router;
