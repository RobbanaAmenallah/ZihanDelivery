import { Router } from 'express';
import {
  createUser,
  listUsers,
  updateUser,
  resetUserPassword,
  deleteUser,
  listClientPricingRules,
  saveClientPricingRuleController,
  deleteClientPricingRuleController,
} from '../controllers/admin.controller.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const adminRouter = Router();

// All admin routes are protected — caller must send a valid Bearer token
// with the admin role verified server-side.
adminRouter.use(requireAdmin);

adminRouter.get('/users', listUsers);
adminRouter.post('/users', createUser);
adminRouter.patch('/users/:id', updateUser);
adminRouter.delete('/users/:id', deleteUser);
adminRouter.post('/users/reset-password', resetUserPassword);

// Client pricing rules
adminRouter.get('/client-pricing', listClientPricingRules);
adminRouter.post('/client-pricing', saveClientPricingRuleController);
adminRouter.delete('/client-pricing/:id', deleteClientPricingRuleController);

export default adminRouter;

