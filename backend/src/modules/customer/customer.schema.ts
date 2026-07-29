import { z } from "zod";

const customerTypes = ["RETAIL", "WHOLESALE", "DISTRIBUTOR"] as const;
const customerStatuses = ["LEAD", "ACTIVE", "INACTIVE"] as const;

export const createCustomerSchema = z.object({
  name: z.string().min(2, "Customer name must be at least 2 characters"),
  mobile: z.string().regex(/^[0-9]{10}$/, "Mobile must be exactly 10 digits"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  businessName: z.string().optional(),
  gstNumber: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]{3}$/, "Invalid GST number format")
    .optional()
    .or(z.literal("")),
  type: z.enum(customerTypes).default("RETAIL"),
  address: z.string().optional(),
  status: z.enum(customerStatuses).default("LEAD"),
  followUpDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const addFollowUpSchema = z.object({
  note: z.string().min(1, "Note cannot be empty"),
  nextDate: z.coerce.date().optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
