import { Router } from "express";
import * as ctrl from "./newsletter.controller";

const router = Router();

router.post(
  "/subscribe",
  ...(Array.isArray(ctrl.subscribe) ? ctrl.subscribe : [ctrl.subscribe])
);
router.delete(
  "/unsubscribe",
  ...(Array.isArray(ctrl.unsubscribe) ? ctrl.unsubscribe : [ctrl.unsubscribe])
);

export default router;
