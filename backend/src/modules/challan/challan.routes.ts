import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { createChallanSchema, updateChallanSchema } from "./challan.schema";
import {
  cancelChallan,
  confirmChallan,
  createChallan,
  getChallan,
  listChallans,
  updateChallan,
} from "./challan.controller";

const router = Router();
router.use(authenticate);

router.get("/", listChallans);
router.get("/:id", getChallan);

router.post("/", authorize("ADMIN", "SALES"), validate(createChallanSchema), createChallan);
router.patch("/:id", authorize("ADMIN", "SALES"), validate(updateChallanSchema), updateChallan);

// Confirming moves physical stock, so warehouse is included alongside sales.
router.post("/:id/confirm", authorize("ADMIN", "SALES", "WAREHOUSE"), confirmChallan);
router.post("/:id/cancel", authorize("ADMIN", "SALES"), cancelChallan);

export default router;
