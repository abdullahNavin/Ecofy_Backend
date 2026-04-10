import { Router } from "express";
import * as ctrl from "./search.controller";

const router = Router();

router.get(
  "/",
  ...(Array.isArray(ctrl.search) ? ctrl.search : [ctrl.search])
);

export default router;
