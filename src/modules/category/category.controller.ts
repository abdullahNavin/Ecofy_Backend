import { Request, Response, NextFunction } from "express";
import * as categoryService from "./category.service";
import { validate } from "../../common/middleware/validate.middleware";
import { createCategorySchema, updateCategorySchema } from "./category.validator";

export const listCategories = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await categoryService.listCategories();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const createCategory = [
  validate(createCategorySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await categoryService.createCategory(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },
];

export const updateCategory = [
  validate(updateCategorySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = String(req.params["id"]);
      const data = await categoryService.updateCategory(id, req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },
];

export const deleteCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = String(req.params["id"]);
    await categoryService.deleteCategory(id);
    res.json({ success: true, data: { message: "Category deleted" } });
  } catch (err) {
    next(err);
  }
};
