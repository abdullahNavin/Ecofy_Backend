import { Request, Response, NextFunction } from "express";
import * as paymentService from "./payment.service";
import { validate } from "../../common/middleware/validate.middleware";
import { checkoutSchema } from "./payment.validator";

export const createCheckout = [
  validate(checkoutSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await paymentService.createCheckout(
        req.user!.id,
        req.body.ideaId
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },
];

export const verifyPurchase = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const sessionId = String(req.params["sessionId"]);
    const data = await paymentService.verifyPurchase(sessionId, req.user!.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const webhook = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const sig = req.headers["stripe-signature"] as string;
    await paymentService.handleWebhook(req.body as Buffer, sig);
    res.json({ received: true });
  } catch (err) {
    next(err);
  }
};

export const listPurchases = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await paymentService.listPurchases(req.user!.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
