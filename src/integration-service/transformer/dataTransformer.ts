import { CsvRow } from "../validation/csvSchema";
import {
  workOrderSchema,
  WorkOrderInput,
} from "../../api/validation/workOrderSchema";

export const transformToApiFormat = (
  groupedData: Map<string, CsvRow[]>
): WorkOrderInput[] => {
  const workOrders: WorkOrderInput[] = [];
  console.log(
    `[Transformer] Starting transformation for ${groupedData.size} work orders...`
  );

  for (const [orderRef, rows] of groupedData.entries()) {
    if (rows.length === 0) {
      console.warn(
        `[Transformer] Skipping order_ref ${orderRef} as it has no rows.`
      );
      continue;
    }
    const firstRow = rows[0];

    try {
      const tasks = rows.map((row) => ({
        taskCode: row.task_identifier,
        description: row.task_description,
        estimatedHours: row.task_hours_estimate,
      }));

      const dateString = `${firstRow.job_date}T${firstRow.job_time}:00Z`;
      const dateObj = new Date(dateString);

      if (isNaN(dateObj.getTime())) {
        throw new Error(
          `Invalid date components (date: '${firstRow.job_date}', time: '${firstRow.job_time}') for order ${orderRef}. Cannot form valid ISO string.`
        );
      }
      const scheduledFor = dateObj.toISOString();

      const apiPayload = {
        customerReference: firstRow.order_ref,
        client: {
          name: firstRow.client_org_name,
          contactPerson: firstRow.client_contact_name,
          phone: firstRow.client_phone_num,
        },
        location: {
          fullAddress: firstRow.site_full_address,
          instructions: firstRow.site_notes || "",
        },
        jobDetails: {
          scheduledFor: scheduledFor,
          tasks: tasks,
        },
      };

      const validationResult = workOrderSchema.safeParse(apiPayload);

      if (!validationResult.success) {
        console.error(
          `[Transformer] Failed to create a valid API payload for ${orderRef} after date construction.`,
          "Input Row 1:",
          firstRow,
          "Constructed scheduledFor:",
          scheduledFor,
          "Errors:",
          validationResult.error.flatten()
        );
        continue;
      }

      workOrders.push(validationResult.data);
    } catch (transformError) {
      console.error(
        `[Transformer] Error during transformation for ${orderRef}:`,
        transformError
      );
      continue;
    }
  }

  console.log(
    `[Transformer] Successfully transformed ${workOrders.length} work orders.`
  );
  return workOrders;
};
