import { Router } from "express";
import { healthController } from "../controllers/index.js";

const router = Router();

router.get("/health", healthController.healthCheckHandler);
router.get("/ready", healthController.readinessHandler);
router.get("/live", healthController.livenessHandler);
router.get("/metrics", healthController.metricsHandler);

const healthRoutes = {
	setupHealthRoutes: () => router,
};

export default healthRoutes;
