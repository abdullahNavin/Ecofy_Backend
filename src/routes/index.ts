import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import categoryRoutes from "../modules/category/category.routes";
import ideaRoutes from "../modules/idea/idea.routes";
import voteRoutes from "../modules/vote/vote.routes";
import commentRoutes from "../modules/comment/comment.routes";
import paymentRoutes from "../modules/payment/payment.routes";
import adminRoutes from "../modules/admin/admin.routes";
import newsletterRoutes from "../modules/newsletter/newsletter.routes";
import searchRoutes from "../modules/search/search.routes";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ success: true, data: { status: "ok", timestamp: new Date().toISOString() } });
});

router.use("/auth", authRoutes);
router.use("/categories", categoryRoutes);
router.use("/ideas", ideaRoutes);

// Nested under ideas
router.use("/ideas/:ideaId/votes", voteRoutes);
router.use("/ideas/:ideaId/comments", commentRoutes);

router.use("/payments", paymentRoutes);
router.use("/admin", adminRoutes);
router.use("/newsletter", newsletterRoutes);
router.use("/search", searchRoutes);

export default router;
