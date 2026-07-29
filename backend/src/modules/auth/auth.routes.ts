import { Router } from "express";
import { validate } from "../../middleware/validate";
import { authenticate } from "../../middleware/auth";
import { loginSchema } from "./auth.schema";
import { login, me } from "./auth.controller";

const router = Router();

router.post("/login", validate(loginSchema), login);
router.get("/me", authenticate, me);

export default router;
