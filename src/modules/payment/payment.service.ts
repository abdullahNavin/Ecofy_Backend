import prisma from "../../lib/prisma";
import { AppError } from "../../common/middleware/errorHandler";
import { stripe } from "../../config/stripe";
import { env } from "../../config/env";
import { createNotification } from "../notification/notification.service";
import { recordIdeaEvent } from "../analytics/analytics.service";

export async function createCheckout(userId: string, ideaId: string) {
  const idea = await prisma.idea.findUnique({ where: { id: ideaId } });
  if (!idea) throw new AppError("Idea not found", 404);
  if (!idea.isPaid || !idea.price) throw new AppError("This idea is free", 400);

  // Check already purchased
  const existing = await prisma.purchase.findUnique({
    where: { userId_ideaId: { userId, ideaId } },
  });
  if (existing?.status === "completed") {
    throw new AppError("You already own this idea", 409);
  }

  const amountCents = Math.round(Number(idea.price) * 100);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    currency: env.STRIPE_CURRENCY,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: env.STRIPE_CURRENCY,
          unit_amount: amountCents,
          product_data: { name: idea.title },
        },
      },
    ],
    success_url: `${env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.CLIENT_URL}/ideas/${ideaId}`,
    metadata: { userId, ideaId },
  });

  // Create pending purchase record
  await prisma.purchase.upsert({
    where: { stripeSessionId: session.id },
    create: {
      userId,
      ideaId,
      amount: idea.price,
      currency: env.STRIPE_CURRENCY,
      stripeSessionId: session.id,
      status: "pending",
    },
    update: { status: "pending" },
  });

  return { checkoutUrl: session.url };
}

export async function verifyPurchase(sessionId: string, userId: string) {
  let purchase = await prisma.purchase.findUnique({
    where: { stripeSessionId: sessionId },
    include: { idea: { select: { id: true, title: true } } },
  });
  if (!purchase) throw new AppError("Purchase not found", 404);
  if (purchase.userId !== userId) throw new AppError("Forbidden", 403);

  if (purchase.status !== "completed") {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status === "paid") {
      purchase = await prisma.purchase.update({
        where: { stripeSessionId: sessionId },
        data: {
          status: "completed",
          stripePaymentIntent:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : purchase.stripePaymentIntent,
        },
        include: { idea: { select: { id: true, title: true } } },
      });
      const idea = await prisma.idea.findUnique({
        where: { id: purchase.ideaId },
        select: { authorId: true, title: true },
      });
      if (idea && idea.authorId !== userId) {
        await createNotification({
          userId: idea.authorId,
          type: "PREMIUM_IDEA_PURCHASED",
          title: "Your premium idea was purchased",
          body: `"${idea.title}" has a new purchase.`,
          href: `/dashboard/member/ideas`,
        }).catch(() => undefined);
      }
      await recordIdeaEvent(purchase.ideaId, "PURCHASE", userId).catch(() => undefined);
    }
  }

  return purchase;
}

export async function handleWebhook(rawBody: Buffer, signature: string) {
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    throw new AppError("Invalid webhook signature", 400);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const purchase = await prisma.purchase.update({
      where: { stripeSessionId: session.id },
      data: {
        status: "completed",
        stripePaymentIntent:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : null,
      },
      include: { idea: { select: { id: true, title: true, authorId: true } } },
    });
    if (purchase.idea.authorId !== purchase.userId) {
      await createNotification({
        userId: purchase.idea.authorId,
        type: "PREMIUM_IDEA_PURCHASED",
        title: "Your premium idea was purchased",
        body: `"${purchase.idea.title}" has a new purchase.`,
        href: `/dashboard/member/ideas`,
      }).catch(() => undefined);
    }
    await recordIdeaEvent(purchase.ideaId, "PURCHASE", purchase.userId).catch(() => undefined);
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object;
    const paymentIntent =
      typeof charge.payment_intent === "string" ? charge.payment_intent : null;
    if (paymentIntent) {
      await prisma.purchase.updateMany({
        where: { stripePaymentIntent: paymentIntent },
        data: { status: "refunded" },
      });
    }
  }
}

export async function listPurchases(userId: string) {
  return prisma.purchase.findMany({
    where: { userId },
    include: { idea: { select: { id: true, title: true, slug: true } } },
    orderBy: { createdAt: "desc" },
  });
}
