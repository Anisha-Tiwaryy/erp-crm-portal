import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { env } from "../config/env";
import { ApiError } from "../utils/apiError";

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  name: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(ApiError.unauthorized("Missing or malformed Authorization header"));
  }
  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, env.jwtSecret) as JwtPayload;
    return next();
  } catch {
    return next(ApiError.unauthorized("Invalid or expired token"));
  }
}

export function authorize(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!allowed.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Role ${req.user.role} cannot access this resource. Allowed: ${allowed.join(", ")}`
        )
      );
    }
    return next();
  };
}
