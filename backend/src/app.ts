import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/error";
import authRoutes from "./modules/auth/auth.routes";
import customerRoutes from "./modules/customer/customer.routes";
import productRoutes from "./modules/product/product.routes";
import challanRoutes from "./modules/challan/challan.routes";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || env.corsOrigins.includes("*") || env.corsOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} is not allowed by CORS`));
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));

  app.get("/health", (_req, res) =>
    res.status(200).json({ success: true, status: "ok", timestamp: new Date().toISOString() })
  );

  app.use("/api/auth", authRoutes);
  app.use("/api/customers", customerRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/challans", challanRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
