/**
 * Generate a URL-friendly slug from a title string.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 100);
}

/**
 * Return pagination meta from total count and page/limit params.
 */
export function paginate(total: number, page: number, limit: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Parse a number from a query string value, with a default and optional max.
 */
export function parseIntParam(
  value: unknown,
  defaultVal: number,
  max?: number
): number {
  const n = parseInt(String(value), 10);
  if (isNaN(n) || n < 1) return defaultVal;
  if (max !== undefined && n > max) return max;
  return n;
}
