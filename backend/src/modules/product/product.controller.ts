import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../utils/apiError";
import { asyncHandler } from "../../utils/asyncHandler";
import { buildMeta, getPageParams } from "../../utils/pagination";

export const listProducts = asyncHandler(async (req: Request, res: Response) => {
  const pageParams = getPageParams(req.query);
  const { search, category, lowStock } = req.query as Record<string, string | undefined>;

  const where: Prisma.ProductWhereInput = {
    isActive: true,
    ...(category ? { category } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { sku: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip: pageParams.skip,
      take: pageParams.limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.count({ where }),
  ]);

  // Prisma cannot compare two columns in a where clause, so the low-stock
  // filter is applied after the query.
  const items =
    lowStock === "true" ? rows.filter((p) => p.currentStock <= p.minStockAlert) : rows;

  res.status(200).json({ success: true, data: items, meta: buildMeta(total, pageParams) });
});

export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: {
      movements: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { createdBy: { select: { id: true, name: true } } },
      },
    },
  });
  if (!product) throw ApiError.notFound("Product not found");
  res.status(200).json({ success: true, data: product });
});

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const { currentStock, ...rest } = req.body;

  const product = await prisma.$transaction(async (tx) => {
    const created = await tx.product.create({ data: { ...rest, currentStock } });
    if (currentStock > 0) {
      await tx.stockMovement.create({
        data: {
          productId: created.id,
          quantity: currentStock,
          type: "IN",
          reason: "Opening stock",
          createdById: req.user!.sub,
        },
      });
    }
    return created;
  });

  res.status(201).json({ success: true, data: product });
});

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const exists = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!exists) throw ApiError.notFound("Product not found");

  const product = await prisma.product.update({ where: { id: req.params.id }, data: req.body });
  res.status(200).json({ success: true, data: product });
});

export const createStockMovement = asyncHandler(async (req: Request, res: Response) => {
  const { quantity, type, reason } = req.body;

  const result = await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: req.params.id } });
    if (!product) throw ApiError.notFound("Product not found");

    const delta = type === "IN" ? quantity : -quantity;
    const newStock = product.currentStock + delta;

    if (newStock < 0) {
      throw ApiError.unprocessable(
        `Insufficient stock for ${product.name} (${product.sku}). Available: ${product.currentStock}, requested: ${quantity}`
      );
    }

    const updated = await tx.product.update({
      where: { id: product.id },
      data: { currentStock: newStock },
    });

    const movement = await tx.stockMovement.create({
      data: { productId: product.id, quantity, type, reason, createdById: req.user!.sub },
      include: { createdBy: { select: { id: true, name: true } } },
    });

    return { movement, product: updated };
  });

  res.status(201).json({ success: true, data: result });
});

export const listMovements = asyncHandler(async (req: Request, res: Response) => {
  const pageParams = getPageParams(req.query);
  const { productId, type } = req.query as Record<string, string | undefined>;

  const where: Prisma.StockMovementWhereInput = {
    ...(productId ? { productId } : {}),
    ...(type ? { type: type as never } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      skip: pageParams.skip,
      take: pageParams.limit,
      orderBy: { createdAt: "desc" },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        createdBy: { select: { id: true, name: true } },
      },
    }),
    prisma.stockMovement.count({ where }),
  ]);

  res.status(200).json({ success: true, data: items, meta: buildMeta(total, pageParams) });
});
