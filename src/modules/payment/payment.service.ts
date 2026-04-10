import prisma from "../../lib/prisma";
import { AppError } from "../../common/middleware/errorHandler";
import { stripe } from "../../config/stripe";
import { env } from "../../config/env";

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
    success_url: `${env.CLIENT_URL}/ideas/${ideaId}?session_id={CHECKOUT_SESSION_ID}`,
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
  const purchase = await prisma.purchase.findUnique({
    where: { stripeSessionId: sessionId },
    include: { idea: { select: { id: true, title: true } } },
  });
  if (!purchase) throw new AppError("Purchase not found", 404);
  if (purchase.userId !== userId) throw new AppError("Forbidden", 403);

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
    await prisma.purchase.update({
      where: { stripeSessionId: session.id },
      data: {
        status: "completed",
        stripePaymentIntent:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : null,
      },
    });
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
