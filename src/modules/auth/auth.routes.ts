import { Router } from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "../../auth/betterAuth";
import * as ctrl from "./auth.controller";
import { requireAuth } from "../../common/middleware/auth.middleware";

const router = Router();

// BetterAuth handles its own routes (signup, signin, signout, session)
router.all("/better-auth/*", toNodeHandler(auth));

// Custom signup (creates user in our users table + hashed password)
router.post("/signup", ...(Array.isArray(ctrl.signup) ? ctrl.signup : [ctrl.signup]));

// Custom login (validates credentials, BetterAuth session via cookie)
router.post("/login", ...(Array.isArray(ctrl.login) ? ctrl.login : [ctrl.login]));

// Profile routes (protected)
router.get("/me", requireAuth, ctrl.getMe);
router.patch("/me", requireAuth, ...(Array.isArray(ctrl.updateMe) ? ctrl.updateMe : [ctrl.updateMe]));
router.patch("/me/password", requireAuth, ...(Array.isArray(ctrl.changePassword) ? ctrl.changePassword : [ctrl.changePassword]));

export default router;
