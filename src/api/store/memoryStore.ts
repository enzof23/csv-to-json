import { WorkOrderInput } from "../validation/workOrderSchema";

export interface WorkOrder extends WorkOrderInput {
  id?: string;
  receivedAt?: string;
}

// --- In-Memory Store ---
// For testing purposes, we use a simple array to store work orders in memory
// This would be a database or persistent storage.
const workOrdersStore: WorkOrder[] = [];

export const addWorkOrder = (workOrderData: WorkOrderInput): WorkOrder => {
  const newWorkOrder: WorkOrder = {
    ...workOrderData,
    receivedAt: new Date().toISOString(),
    location: {
      ...workOrderData.location,
      instructions: workOrderData.location.instructions ?? "",
    },
  };
  workOrdersStore.push(newWorkOrder);
  console.log(
    `[Store] Added Work Order: ${newWorkOrder.customerReference}. Total: ${workOrdersStore.length}`
  );
  return newWorkOrder;
};

export const getAllWorkOrders = (): WorkOrder[] => {
  console.log(`[Store] Retrieving all ${workOrdersStore.length} work orders.`);
  return [...workOrdersStore];
};

export const clearWorkOrders = (): void => {
  workOrdersStore.length = 0;
  console.log(`[Store] All work orders cleared.`);
};
