import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import * as cellCulturesController from './cellCultures.controller';
import * as passagesController from './passages.controller';

const router = Router();

// Every route in this module requires a valid, authenticated user.
router.use(authenticate);

// --- Cell culture CRUD ---
// Viewing: any authenticated user. Creating/updating/deleting: admin only.
router.post('/', requireRole('admin'), cellCulturesController.create);
router.get('/', cellCulturesController.list);
router.get('/:id', cellCulturesController.getOne);
router.put('/:id', requireRole('admin'), cellCulturesController.update);
router.delete('/:id', requireRole('admin'), cellCulturesController.remove);

// --- Passage records (nested under a culture) ---
// Recording and viewing passages: any authenticated user (consistent with
// how incubator readings are handled — logging lab activity isn't
// restricted the way managing the parent resource is).
router.post('/:id/passages', passagesController.create);
router.get('/:id/passages', passagesController.list);

export default router;
