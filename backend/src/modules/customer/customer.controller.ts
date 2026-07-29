import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../utils/apiError";
import { asyncHandler } from "../../utils/asyncHandler";
import { buildMeta, getPageParams } from "../../utils/pagination";

export const listCustomers = asyncHandler(async (req: Request, res: Response) => {
  const pageParams = getPageParams(req.query);
  const { search, status, type } = req.query as Record<string, string | undefined>;

  const where: Prisma.CustomerWhereInput = {
    ...(status ? { status: status as never } : {}),
    ...(type ? { type: type as never } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { mobile: { contains: search } },
            { businessName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip: pageParams.skip,
      take: pageParams.limit,
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { id: true, name: true } } },
    }),
    prisma.customer.count({ where }),
  ]);

  res.status(200).json({ success: true, data: items, meta: buildMeta(total, pageParams) });
});

export const getCustomer = asyncHandler(async (req: Request, res: Response) => {
  const customer = await prisma.customer.findUnique({
    where: { id: req.params.id },
    include: {
      createdBy: { select: { id: true, name: true } },
      followUps: {
        orderBy: { createdAt: "desc" },
        include: { createdBy: { select: { id: true, name: true } } },
      },
      challans: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          challanNumber: true,
          status: true,
          totalQuantity: true,
          totalAmount: true,
          createdAt: true,
        },
      },
    },
  });
  if (!customer) throw ApiError.notFound("Customer not found");
  res.status(200).json({ success: true, data: customer });
});

export const createCustomer = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body;
  const customer = await prisma.customer.create({
    data: {
      ...body,
      email: body.email || null,
      gstNumber: body.gstNumber || null,
      createdById: req.user!.sub,
    },
  });
  res.status(201).json({ success: true, data: customer });
});

export const updateCustomer = asyncHandler(async (req: Request, res: Response) => {
  const exists = await prisma.customer.findUnique({ where: { id: req.params.id } });
  if (!exists) throw ApiError.notFound("Customer not found");

  const customer = await prisma.customer.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.status(200).json({ success: true, data: customer });
});

export const addFollowUp = asyncHandler(async (req: Request, res: Response) => {
  const customer = await prisma.customer.findUnique({ where: { id: req.params.id } });
  if (!customer) throw ApiError.notFound("Customer not found");

  const followUp = await prisma.$transaction(async (tx) => {
    const created = await tx.followUp.create({
      data: {
        customerId: customer.id,
        note: req.body.note,
        nextDate: req.body.nextDate ?? null,
        createdById: req.user!.sub,
      },
      include: { createdBy: { select: { id: true, name: true } } },
    });
    if (req.body.nextDate) {
      await tx.customer.update({
        where: { id: customer.id },
        data: { followUpDate: req.body.nextDate },
      });
    }
    return created;
  });

  res.status(201).json({ success: true, data: followUp });
});
