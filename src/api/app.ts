import express, { Express, Request, Response, NextFunction } from "express";
import config from "../config";
import { apiKeyAuth } from "./middleware/auth";
import workOrderRoutes from "./routes/workOrders";

const app: Express = express();

app.use(express.json());

app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.get("/", (req: Request, res: Response) => {
  res.status(200).send("Work Order API is running!");
});

app.use("/api/v1", apiKeyAuth);

app.use("/api/v1/work-orders", workOrderRoutes);

export default app;
