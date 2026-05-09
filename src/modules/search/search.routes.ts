import { Router } from "express";
import * as ctrl from "./search.controller";
import { requireAuth } from "../../common/middleware/auth.middleware";

const router = Router();

router.get(
  "/",
  ...(Array.isArray(ctrl.search) ? ctrl.search : [ctrl.search])
);
router.get("/recommendations", requireAuth, ctrl.recommendations);

export default router;
