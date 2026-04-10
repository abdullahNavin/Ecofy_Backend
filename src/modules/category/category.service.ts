import prisma from "../../lib/prisma";
import { slugify } from "../../common/utils/helpers";
import { AppError } from "../../common/middleware/errorHandler";
import { z } from "zod";
import { createCategorySchema, updateCategorySchema } from "./category.validator";

export async function listCategories() {
  return prisma.category.findMany({
    orderBy: { name: "asc" },
  });
}

export async function createCategory(data: z.infer<typeof createCategorySchema>) {
  const existing = await prisma.category.findUnique({
    where: { name: data.name },
  });
  if (existing) throw new AppError("Category already exists", 409);

  return prisma.category.create({
    data: {
      name: data.name,
      slug: slugify(data.name),
    },
  });
}

export async function updateCategory(
  id: string,
  data: z.infer<typeof updateCategorySchema>
) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw new AppError("Category not found", 404);

  return prisma.category.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name, slug: slugify(data.name) }),
    },
  });
}

export async function deleteCategory(id: string) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw new AppError("Category not found", 404);
  await prisma.category.delete({ where: { id } });
}
