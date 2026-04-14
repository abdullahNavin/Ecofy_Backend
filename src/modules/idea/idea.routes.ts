import { Router } from "express";
import * as ctrl from "./idea.controller";
import { requireAuth } from "../../common/middleware/auth.middleware";

const router = Router();

// Public (with optional auth for paid-idea gating)
router.get(
  "/",
  (req, res, next) => {
    // Try to attach user if session exists, but don't block if not
    import("../../common/middleware/auth.middleware").then(({ requireAuth: ra }) => {
      ra(req, res, (err) => {
        if (err) return next(); // ignore auth errors on public route
        next();
      });
    });
  },
  ...(Array.isArray(ctrl.listIdeas) ? ctrl.listIdeas : [ctrl.listIdeas])
);

// Member-only listing must come before "/:id" so "mine" is not treated as an idea id.
router.get("/mine", requireAuth, ctrl.listMyIdeas);

router.get(
  "/:id",
  (req, res, next) => {
    import("../../common/middleware/auth.middleware").then(({ requireAuth: ra }) => {
      ra(req, res, (err) => {
        if (err) return next();
        next();
      });
    });
  },
  ctrl.getIdea
);

// Member only
router.post(
  "/",
  requireAuth,
  ...(Array.isArray(ctrl.createIdea) ? ctrl.createIdea : [ctrl.createIdea])
);
router.patch(
  "/:id",
  requireAuth,
  ...(Array.isArray(ctrl.updateIdea) ? ctrl.updateIdea : [ctrl.updateIdea])
);
router.delete("/:id", requireAuth, ctrl.deleteIdea);
router.patch("/:id/submit", requireAuth, ctrl.submitIdea);

export default router;
