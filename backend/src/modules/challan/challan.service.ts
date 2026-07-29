import { Prisma } from "@prisma/client";
import { ApiError } from "../../utils/apiError";

/**
 * Generates a sequential, gap-free challan number of the form CH-2026-000123.
 * The counter row is incremented inside the caller's transaction, so two
 * concurrent requests cannot be handed the same number.
 */
export async function nextChallanNumber(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const key = `challan-${year}`;

  const counter = await tx.counter.upsert({
    where: { key },
    create: { key, value: 1 },
    update: { value: { increment: 1 } },
  });

  return `CH-${year}-${String(counter.value).padStart(6, "0")}`;
}

/**
 * Builds snapshot line items. The product name, SKU and unit price are copied
 * onto the challan so a later price change on the product master does not
 * silently rewrite historical documents.
 */
export async function buildSnapshotItems(
  tx: Prisma.TransactionClient,
  items: { productId: string; quantity: number }[]
) {
  const ids = [...new Set(items.map((i) => i.productId))];
  const products = await tx.product.findMany({ where: { id: { in: ids } } });

  const byId = new Map(products.map((p) => [p.id, p]));
  const missing = ids.filter((id) => !byId.has(id));
  if (missing.length) {
    throw ApiError.badRequest("One or more products do not exist", { productIds: missing });
  }

  // Merge duplicate lines for the same product so stock maths stays correct.
  const merged = new Map<string, number>();
  for (const item of items) {
    merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.quantity);
  }

  let totalQuantity = 0;
  let totalAmount = new Prisma.Decimal(0);

  const lines = [...merged.entries()].map(([productId, quantity]) => {
    const product = byId.get(productId)!;
    const lineTotal = new Prisma.Decimal(product.unitPrice).mul(quantity);
    totalQuantity += quantity;
    totalAmount = totalAmount.add(lineTotal);

    return {
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      category: product.category,
      unitPrice: product.unitPrice,
      quantity,
      lineTotal,
    };
  });

  return { lines, totalQuantity, totalAmount };
}

/**
 * Reserves stock for a confirmed challan.
 *
 * Uses a conditional updateMany (`currentStock >= quantity`) rather than a
 * read-then-write. Postgres evaluates the predicate and the update atomically,
 * so two challans confirming the same last unit cannot both succeed and drive
 * stock negative. If the update affects zero rows, stock was insufficient.
 */
export async function deductStock(
  tx: Prisma.TransactionClient,
  lines: { productId: string; productName: string; sku: string; quantity: number }[],
  userId: string,
  challanNumber: string
) {
  for (const line of lines) {
    const result = await tx.product.updateMany({
      where: { id: line.productId, currentStock: { gte: line.quantity } },
      data: { currentStock: { decrement: line.quantity } },
    });

    if (result.count === 0) {
      const current = await tx.product.findUnique({ where: { id: line.productId } });
      throw ApiError.unprocessable(
        `Insufficient stock for ${line.productName} (${line.sku}). Available: ${
          current?.currentStock ?? 0
        }, required: ${line.quantity}`,
        {
          productId: line.productId,
          sku: line.sku,
          available: current?.currentStock ?? 0,
          required: line.quantity,
        }
      );
    }

    await tx.stockMovement.create({
      data: {
        productId: line.productId,
        quantity: line.quantity,
        type: "OUT",
        reason: `Sales challan ${challanNumber}`,
        createdById: userId,
      },
    });
  }
}

/** Returns stock to inventory when a confirmed challan is cancelled. */
export async function restoreStock(
  tx: Prisma.TransactionClient,
  lines: { productId: string; quantity: number }[],
  userId: string,
  challanNumber: string
) {
  for (const line of lines) {
    await tx.product.update({
      where: { id: line.productId },
      data: { currentStock: { increment: line.quantity } },
    });
    await tx.stockMovement.create({
      data: {
        productId: line.productId,
        quantity: line.quantity,
        type: "IN",
        reason: `Cancellation of challan ${challanNumber}`,
        createdById: userId,
      },
    });
  }
}
