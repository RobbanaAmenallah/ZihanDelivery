import { Router } from 'express';
import healthRoutes from './health.routes.js';
import adminRoutes from './admin.routes.js';

const apiRouter = Router();

// Mount modules
apiRouter.use('/health', healthRoutes);
apiRouter.use('/admin', adminRoutes);

export default apiRouter;
