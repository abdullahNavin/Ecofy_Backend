import { Router } from "express";
import * as ctrl from "./comment.controller";
import { requireAuth } from "../../common/middleware/auth.middleware";

// Mounted at /api/v1/ideas/:ideaId/comments
const router = Router({ mergeParams: true });

router.get("/", ctrl.getComments);
router.post(
  "/",
  requireAuth,
  ...(Array.isArray(ctrl.createComment) ? ctrl.createComment : [ctrl.createComment])
);
router.post(
  "/:commentId/replies",
  requireAuth,
  ...(Array.isArray(ctrl.replyToComment) ? ctrl.replyToComment : [ctrl.replyToComment])
);
router.delete("/:commentId", requireAuth, ctrl.deleteComment);

export default router;
