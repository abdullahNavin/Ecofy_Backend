import { Request, Response, NextFunction } from "express";
import * as notificationService from "./notification.service";

export async function listNotifications(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const unreadOnly = req.query["unreadOnly"] === "true";
    const [data, unreadCount] = await Promise.all([
      notificationService.listNotifications(req.user!.id, unreadOnly),
      notificationService.getUnreadCount(req.user!.id),
    ]);
    res.json({ success: true, data, meta: { unreadCount } });
  } catch (err) {
    next(err);
  }
}

export async function markRead(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    await notificationService.markNotificationRead(
      req.user!.id,
      String(req.params["id"])
    );
    res.json({ success: true, data: { message: "Notification marked read" } });
  } catch (err) {
    next(err);
  }
}

export async function markAllRead(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    await notificationService.markAllNotificationsRead(req.user!.id);
    res.json({ success: true, data: { message: "Notifications marked read" } });
  } catch (err) {
    next(err);
  }
}
