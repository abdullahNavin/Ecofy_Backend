import { Router } from "express";
import { requireAuth } from "../../common/middleware/auth.middleware";
import * as ctrl from "./ai.controller";

const router = Router();

router.post(
  "/idea-assistant",
  requireAuth,
  ...(Array.isArray(ctrl.ideaAssistant) ? ctrl.ideaAssistant : [ctrl.ideaAssistant])
);

export default router;
