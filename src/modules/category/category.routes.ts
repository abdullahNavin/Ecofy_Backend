import { Router } from "express";
import * as ctrl from "./category.controller";
import { requireAuth } from "../../common/middleware/auth.middleware";
import { requireAdmin } from "../../common/middleware/role.middleware";

const router = Router();

router.get("/", ctrl.listCategories);
router.post("/", requireAuth, requireAdmin, ...(Array.isArray(ctrl.createCategory) ? ctrl.createCategory : [ctrl.createCategory]));
router.patch("/:id", requireAuth, requireAdmin, ...(Array.isArray(ctrl.updateCategory) ? ctrl.updateCategory : [ctrl.updateCategory]));
router.delete("/:id", requireAuth, requireAdmin, ctrl.deleteCategory);

export default router;
