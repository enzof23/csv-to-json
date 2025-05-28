import { Router } from "express";
import {
  createWorkOrder,
  getWorkOrders,
} from "../controllers/workOrderController";

const router = Router();

router.post("/", createWorkOrder);

router.get("/", getWorkOrders);

export default router;
