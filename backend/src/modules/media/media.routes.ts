import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import * as mediaController from './media.controller';

const router = Router();

// Every route in this module requires a valid, authenticated user.
router.use(authenticate);

// Viewing: any authenticated user. Creating/updating: admin only.
router.post('/', requireRole('admin'), mediaController.create);
router.get('/', mediaController.list);
router.get('/:id', mediaController.getOne);
router.put('/:id', requireRole('admin'), mediaController.update);

export default router;
