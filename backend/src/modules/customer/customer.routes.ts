import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  addFollowUpSchema,
  createCustomerSchema,
  updateCustomerSchema,
} from "./customer.schema";
import {
  addFollowUp,
  createCustomer,
  getCustomer,
  listCustomers,
  updateCustomer,
} from "./customer.controller";

const router = Router();
router.use(authenticate);

// Every logged-in role may read the CRM; only ADMIN and SALES may write to it.
router.get("/", listCustomers);
router.get("/:id", getCustomer);
router.post("/", authorize("ADMIN", "SALES"), validate(createCustomerSchema), createCustomer);
router.patch("/:id", authorize("ADMIN", "SALES"), validate(updateCustomerSchema), updateCustomer);
router.post("/:id/follow-ups", authorize("ADMIN", "SALES"), validate(addFollowUpSchema), addFollowUp);

export default router;
