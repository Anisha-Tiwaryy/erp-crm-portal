export interface PageParams {
  page: number;
  limit: number;
  skip: number;
}

export function getPageParams(query: Record<string, unknown>): PageParams {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
  return { page, limit, skip: (page - 1) * limit };
}

export function buildMeta(total: number, { page, limit }: PageParams) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
