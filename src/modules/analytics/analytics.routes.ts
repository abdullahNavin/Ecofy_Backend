import { Router } from "express";
import { requireAuth } from "../../common/middleware/auth.middleware";
import * as ctrl from "./analytics.controller";

const router = Router();

router.get("/creator", requireAuth, ctrl.creatorAnalytics);

export default router;
