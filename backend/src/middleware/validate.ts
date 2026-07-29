import { NextFunction, Request, Response } from "express";
import { AnyZodObject, ZodError } from "zod";
import { ApiError } from "../utils/apiError";

type Source = "body" | "query" | "params";

export const validate =
  (schema: AnyZodObject, source: Source = "body") =>
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[source]);
      if (source === "body") req.body = parsed;
      else Object.assign(req[source], parsed);
      return next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(
          ApiError.badRequest(
            "Validation failed",
            err.errors.map((e) => ({ field: e.path.join("."), message: e.message }))
          )
        );
      }
      return next(err);
    }
  };
