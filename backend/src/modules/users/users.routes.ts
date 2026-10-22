import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import * as usersController from './users.controller';

const router = Router();

router.use(authenticate, requireRole('admin'));
router.get('/', usersController.list);
router.post('/', usersController.create);
router.delete('/:id', usersController.remove);

export default router;
