import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  createProductSchema,
  stockMovementSchema,
  updateProductSchema,
} from "./product.schema";
import {
  createProduct,
  createStockMovement,
  getProduct,
  listMovements,
  listProducts,
  updateProduct,
} from "./product.controller";

const router = Router();
router.use(authenticate);

router.get("/movements", listMovements);
router.get("/", listProducts);
router.get("/:id", getProduct);

// Product master and stock are owned by ADMIN and WAREHOUSE.
router.post("/", authorize("ADMIN", "WAREHOUSE"), validate(createProductSchema), createProduct);
router.patch("/:id", authorize("ADMIN", "WAREHOUSE"), validate(updateProductSchema), updateProduct);
router.post(
  "/:id/movements",
  authorize("ADMIN", "WAREHOUSE"),
  validate(stockMovementSchema),
  createStockMovement
);

export default router;
