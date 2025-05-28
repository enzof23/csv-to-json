import { RequestHandler } from "express";
import { addWorkOrder, getAllWorkOrders } from "../store/memoryStore";
import { workOrderSchema } from "../validation/workOrderSchema";

export const createWorkOrder: RequestHandler = (req, res) => {
  try {
    const validationResult = workOrderSchema.safeParse(req.body);

    if (!validationResult.success) {
      console.error(
        "[Controller] Zod validation failed:",
        validationResult.error.flatten()
      );
      res.status(400).json({
        error: "Bad Request",
        message: "Invalid work order data provided.",
        details: validationResult.error.flatten(),
      });
      return;
    }

    const validWorkOrderData = validationResult.data;

    const newWorkOrder = addWorkOrder(validWorkOrderData);

    res.status(201).json(newWorkOrder);
    return;
  } catch (error) {
    console.error("[Controller] Error creating work order:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "An unexpected error occurred while processing your request.",
    });
    return;
  }
};

export const getWorkOrders: RequestHandler = (req, res) => {
  try {
    const allOrders = getAllWorkOrders();
    res.status(200).json(allOrders);
    return;
  } catch (error) {
    console.error("[Controller] Error getting work orders:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "An unexpected error occurred.",
    });
    return;
  }
};
