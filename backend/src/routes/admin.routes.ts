import { Router } from 'express';
import {
  createUser,
  listUsers,
  updateUser,
  resetUserPassword,
  deleteUser,
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

export default adminRouter;
