import { Router } from "express";
import * as ctrl from "./admin.controller";
import { requireAuth } from "../../common/middleware/auth.middleware";
import { requireAdmin } from "../../common/middleware/role.middleware";

const router = Router();

// All admin routes require auth + ADMIN role
router.use(requireAuth, requireAdmin);

// Ideas
router.get("/overview", ctrl.overview);
router.get(
  "/audit-logs",
  ...(Array.isArray(ctrl.listAuditLogs) ? ctrl.listAuditLogs : [ctrl.listAuditLogs])
);
router.get(
  "/ideas",
  ...(Array.isArray(ctrl.listIdeas) ? ctrl.listIdeas : [ctrl.listIdeas])
);
router.patch("/ideas/:id/approve", ctrl.approveIdea);
router.patch(
  "/ideas/:id/reject",
  ...(Array.isArray(ctrl.rejectIdea) ? ctrl.rejectIdea : [ctrl.rejectIdea])
);
router.patch(
  "/ideas/:id/status",
  ...(Array.isArray(ctrl.updateIdeaStatus) ? ctrl.updateIdeaStatus : [ctrl.updateIdeaStatus])
);
router.delete("/ideas/:id", ctrl.deleteIdea);

// Users
router.get(
  "/users",
  ...(Array.isArray(ctrl.listUsers) ? ctrl.listUsers : [ctrl.listUsers])
);
router.patch("/users/:id/activate", ctrl.activateUser);
router.patch("/users/:id/deactivate", ctrl.deactivateUser);
router.patch("/users/:id/role", ctrl.changeUserRole);

export default router;
