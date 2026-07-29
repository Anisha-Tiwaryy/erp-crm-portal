import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma";
import { env } from "../../config/env";
import { ApiError } from "../../utils/apiError";
import { asyncHandler } from "../../utils/asyncHandler";
import { LoginInput } from "./auth.schema";

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as LoginInput;

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  // Same message for unknown email and wrong password so the endpoint does not
  // leak which accounts exist.
  if (!user || !user.isActive) throw ApiError.unauthorized("Invalid email or password");

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw ApiError.unauthorized("Invalid email or password");

  const token = jwt.sign(
    { sub: user.id, email: user.email, role: user.role, name: user.name },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn } as jwt.SignOptions
  );

  res.status(200).json({
    success: true,
    data: {
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    },
  });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.sub },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  if (!user) throw ApiError.notFound("User not found");
  res.status(200).json({ success: true, data: user });
});
