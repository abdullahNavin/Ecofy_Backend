import { Router, raw } from "express";
import * as ctrl from "./payment.controller";
import { requireAuth } from "../../common/middleware/auth.middleware";

const router = Router();

// Stripe webhook needs raw body
router.post(
  "/webhook",
  raw({ type: "application/json" }),
  ctrl.webhook
);

router.post(
  "/checkout",
  requireAuth,
  ...(Array.isArray(ctrl.createCheckout) ? ctrl.createCheckout : [ctrl.createCheckout])
);
router.get("/verify/:sessionId", requireAuth, ctrl.verifyPurchase);
router.get("/purchases", requireAuth, ctrl.listPurchases);

export default router;
