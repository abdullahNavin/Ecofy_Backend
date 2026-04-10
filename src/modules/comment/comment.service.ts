import prisma from "../../lib/prisma";
import { AppError } from "../../common/middleware/errorHandler";

const commentSelect = {
  id: true,
  content: true,
  isDeleted: true,
  createdAt: true,
  author: { select: { id: true, name: true, avatarUrl: true } },
};

function buildTree(comments: CommentFlat[]): CommentNode[] {
  const map = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  for (const c of comments) {
    map.set(c.id, { ...c, replies: [] });
  }

  for (const c of comments) {
    if (c.parentId) {
      const parent = map.get(c.parentId);
      if (parent) {
        parent.replies.push(map.get(c.id)!);
      }
    } else {
      roots.push(map.get(c.id)!);
    }
  }

  return roots;
}

interface CommentFlat {
  id: string;
  content: string;
  isDeleted: boolean;
  createdAt: Date;
  parentId: string | null;
  author: { id: string; name: string; avatarUrl: string | null };
}

interface CommentNode extends CommentFlat {
  replies: CommentNode[];
}

export async function getComments(ideaId: string) {
  const idea = await prisma.idea.findUnique({ where: { id: ideaId } });
  if (!idea) throw new AppError("Idea not found", 404);

  const flat = await prisma.comment.findMany({
    where: { ideaId },
    orderBy: { createdAt: "asc" },
    select: { ...commentSelect, parentId: true },
  });

  // Mask deleted comment content
  const masked = flat.map((c) => ({
    ...c,
    content: c.isDeleted ? "[deleted]" : c.content,
  }));

  return buildTree(masked);
}

export async function createComment(
  authorId: string,
  ideaId: string,
  content: string,
  parentId?: string
) {
  const idea = await prisma.idea.findUnique({ where: { id: ideaId } });
  if (!idea) throw new AppError("Idea not found", 404);

  if (parentId) {
    const parent = await prisma.comment.findUnique({ where: { id: parentId } });
    if (!parent || parent.ideaId !== ideaId) {
      throw new AppError("Parent comment not found", 404);
    }
  }

  const [comment] = await prisma.$transaction([
    prisma.comment.create({
      data: { content, authorId, ideaId, parentId: parentId ?? null },
      select: { ...commentSelect, parentId: true },
    }),
    prisma.idea.update({
      where: { id: ideaId },
      data: { commentCount: { increment: 1 } },
    }),
  ]);

  return comment;
}

export async function deleteComment(
  commentId: string,
  userId: string,
  userRole: string
) {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) throw new AppError("Comment not found", 404);

  if (comment.authorId !== userId && userRole !== "ADMIN") {
    throw new AppError("Forbidden", 403);
  }

  // Soft delete
  await prisma.comment.update({
    where: { id: commentId },
    data: { isDeleted: true, content: "[deleted]" },
  });
}
