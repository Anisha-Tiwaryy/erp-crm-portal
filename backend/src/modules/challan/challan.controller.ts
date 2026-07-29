import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../utils/apiError";
import { asyncHandler } from "../../utils/asyncHandler";
import { buildMeta, getPageParams } from "../../utils/pagination";
import {
  buildSnapshotItems,
  deductStock,
  nextChallanNumber,
  restoreStock,
} from "./challan.service";

const challanInclude = {
  items: true,
  customer: { select: { id: true, name: true, businessName: true, mobile: true, type: true } },
  createdBy: { select: { id: true, name: true, role: true } },
};

export const listChallans = asyncHandler(async (req: Request, res: Response) => {
  const pageParams = getPageParams(req.query);
  const { status, customerId, search } = req.query as Record<string, string | undefined>;

  const where: Prisma.ChallanWhereInput = {
    ...(status ? { status: status as never } : {}),
    ...(customerId ? { customerId } : {}),
    ...(search ? { challanNumber: { contains: search, mode: "insensitive" } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.challan.findMany({
      where,
      skip: pageParams.skip,
      take: pageParams.limit,
      orderBy: { createdAt: "desc" },
      include: challanInclude,
    }),
    prisma.challan.count({ where }),
  ]);

  res.status(200).json({ success: true, data: items, meta: buildMeta(total, pageParams) });
});

export const getChallan = asyncHandler(async (req: Request, res: Response) => {
  const challan = await prisma.challan.findUnique({
    where: { id: req.params.id },
    include: challanInclude,
  });
  if (!challan) throw ApiError.notFound("Challan not found");
  res.status(200).json({ success: true, data: challan });
});

export const createChallan = asyncHandler(async (req: Request, res: Response) => {
  const { customerId, items, status, remarks } = req.body;
  const userId = req.user!.sub;

  const challan = await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw ApiError.badRequest("Customer not found");

    const { lines, totalQuantity, totalAmount } = await buildSnapshotItems(tx, items);
    const challanNumber = await nextChallanNumber(tx);

    // Stock only moves when the document is confirmed. Drafts are non-binding.
    if (status === "CONFIRMED") {
      await deductStock(tx, lines, userId, challanNumber);
    }

    return tx.challan.create({
      data: {
        challanNumber,
        customerId,
        status,
        remarks,
        totalQuantity,
        totalAmount,
        createdById: userId,
        confirmedAt: status === "CONFIRMED" ? new Date() : null,
        items: { create: lines },
      },
      include: challanInclude,
    });
  });

  res.status(201).json({ success: true, data: challan });
});

export const confirmChallan = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.sub;

  const challan = await prisma.$transaction(async (tx) => {
    const existing = await tx.challan.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });
    if (!existing) throw ApiError.notFound("Challan not found");
    if (existing.status === "CONFIRMED") {
      throw ApiError.conflict("Challan is already confirmed");
    }
    if (existing.status === "CANCELLED") {
      throw ApiError.conflict("A cancelled challan cannot be confirmed");
    }

    await deductStock(tx, existing.items, userId, existing.challanNumber);

    return tx.challan.update({
      where: { id: existing.id },
      data: { status: "CONFIRMED", confirmedAt: new Date() },
      include: challanInclude,
    });
  });

  res.status(200).json({ success: true, data: challan });
});

export const cancelChallan = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.sub;

  const challan = await prisma.$transaction(async (tx) => {
    const existing = await tx.challan.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });
    if (!existing) throw ApiError.notFound("Challan not found");
    if (existing.status === "CANCELLED") {
      throw ApiError.conflict("Challan is already cancelled");
    }

    // Only a confirmed challan has consumed stock, so only that case is reversed.
    if (existing.status === "CONFIRMED") {
      await restoreStock(tx, existing.items, userId, existing.challanNumber);
    }

    return tx.challan.update({
      where: { id: existing.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
      include: challanInclude,
    });
  });

  res.status(200).json({ success: true, data: challan });
});

export const updateChallan = asyncHandler(async (req: Request, res: Response) => {
  const challan = await prisma.$transaction(async (tx) => {
    const existing = await tx.challan.findUnique({ where: { id: req.params.id } });
    if (!existing) throw ApiError.notFound("Challan not found");
    if (existing.status !== "DRAFT") {
      throw ApiError.conflict("Only a draft challan can be edited");
    }

    const { items, customerId, remarks } = req.body;
    let totals = {};

    if (items) {
      const built = await buildSnapshotItems(tx, items);
      await tx.challanItem.deleteMany({ where: { challanId: existing.id } });
      await tx.challanItem.createMany({
        data: built.lines.map((l) => ({ ...l, challanId: existing.id })),
      });
      totals = { totalQuantity: built.totalQuantity, totalAmount: built.totalAmount };
    }

    return tx.challan.update({
      where: { id: existing.id },
      data: { ...(customerId ? { customerId } : {}), ...(remarks !== undefined ? { remarks } : {}), ...totals },
      include: challanInclude,
    });
  });

  res.status(200).json({ success: true, data: challan });
});
