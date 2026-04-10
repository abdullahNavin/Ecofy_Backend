import { Router } from "express";
import * as ctrl from "./vote.controller";
import { requireAuth } from "../../common/middleware/auth.middleware";

// Mounted at /api/v1/ideas/:ideaId/votes
const router = Router({ mergeParams: true });

router.post(
  "/",
  requireAuth,
  ...(Array.isArray(ctrl.castVote) ? ctrl.castVote : [ctrl.castVote])
);
router.delete("/", requireAuth, ctrl.removeVote);

export default router;
