import config from "../../config";
import { WorkOrderInput } from "../../api/validation/workOrderSchema";

const workOrderApiUrl = `${config.apiBaseUrl}/api/v1/work-orders`;

export const submitWorkOrder = async (
  workOrder: WorkOrderInput
): Promise<void> => {
  console.log(
    `[API Client] Attempting to submit: ${workOrder.customerReference}`
  );

  try {
    const response = await fetch(workOrderApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Api-Key": config.apiKey,
      },
      body: JSON.stringify(workOrder),
    });

    if (response.ok) {
      const responseData = await response.json();
      console.log(
        `[API Client] Successfully submitted ${workOrder.customerReference}. Status: ${response.status}`
      );
      return;
    } else {
      let errorDetails = "Could not parse error response body.";
      try {
        errorDetails = await response.json();
      } catch (parseError) {
        try {
          errorDetails = await response.text();
        } catch (textError) {}
      }

      console.error(
        `[API Client] API Error for ${workOrder.customerReference}. Status: ${response.status}`,
        errorDetails
      );
      throw new Error(
        `API returned status ${response.status} for ${workOrder.customerReference}`
      );
    }
  } catch (error) {
    console.error(
      `[API Client] Network/Fetch error submitting ${workOrder.customerReference}:`,
      error
    );
    throw error;
  }
};
