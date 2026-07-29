import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters"),
  sku: z.string().min(2, "SKU is required").transform((s) => s.trim().toUpperCase()),
  category: z.string().optional(),
  unitPrice: z.coerce.number().nonnegative("Unit price cannot be negative"),
  currentStock: z.coerce.number().int().min(0, "Opening stock cannot be negative").default(0),
  minStockAlert: z.coerce.number().int().min(0).default(0),
  location: z.string().optional(),
});

export const updateProductSchema = createProductSchema.partial().omit({ currentStock: true });

// Stock is never edited directly. It only changes through a logged movement,
// which keeps currentStock and the movement ledger consistent.
export const stockMovementSchema = z.object({
  quantity: z.coerce.number().int().positive("Quantity must be greater than zero"),
  type: z.enum(["IN", "OUT"]),
  reason: z.string().min(1, "A reason is required for every stock movement"),
});
