import { z } from "zod";

export const createChallanSchema = z.object({
  customerId: z.string().uuid("A valid customerId is required"),
  status: z.enum(["DRAFT", "CONFIRMED"]).default("DRAFT"),
  remarks: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid("A valid productId is required"),
        quantity: z.coerce.number().int().positive("Quantity must be greater than zero"),
      })
    )
    .min(1, "A challan must contain at least one product"),
});

export const updateChallanSchema = createChallanSchema.omit({ status: true }).partial();
