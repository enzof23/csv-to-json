import { transformToApiFormat } from "../../src/integration-service/transformer/dataTransformer";
import { CsvRow } from "../../src/integration-service/validation/csvSchema";
import { WorkOrderInput } from "../../src/api/validation/workOrderSchema";

describe("Data Transformer (transformToApiFormat)", () => {
  it("should correctly transform a single work order with multiple tasks", () => {
    const inputMap = new Map<string, CsvRow[]>();
    const csvRows: CsvRow[] = [
      {
        order_ref: "WO-123",
        client_org_name: "Client X",
        client_contact_name: "Contact A",
        client_phone_num: "111",
        site_full_address: "Addr 1",
        site_notes: "Notes A",
        job_date: "2025-08-01",
        job_time: "10:00",
        task_identifier: "TASK-A",
        task_description: "Do task A",
        task_hours_estimate: 2.0,
      },
      {
        order_ref: "WO-123",
        client_org_name: "Client X",
        client_contact_name: "Contact A",
        client_phone_num: "111",
        site_full_address: "Addr 1",
        site_notes: "Notes A",
        job_date: "2025-08-01",
        job_time: "10:00",
        task_identifier: "TASK-B",
        task_description: "Do task B",
        task_hours_estimate: 3.5,
      },
    ];
    inputMap.set("WO-123", csvRows);

    const result: WorkOrderInput[] = transformToApiFormat(inputMap);

    expect(result).toHaveLength(1);
    const workOrder = result[0];
    expect(workOrder.customerReference).toBe("WO-123");
    expect(workOrder.client.name).toBe("Client X");
    expect(workOrder.location.fullAddress).toBe("Addr 1");
    expect(workOrder.jobDetails.scheduledFor).toBe("2025-08-01T10:00:00.000Z");
    expect(workOrder.jobDetails.tasks).toHaveLength(2);
    expect(workOrder.jobDetails.tasks[0].taskCode).toBe("TASK-A");
    expect(workOrder.jobDetails.tasks[1].taskCode).toBe("TASK-B");
    expect(workOrder.jobDetails.tasks[1].estimatedHours).toBe(3.5);
  });

  it("should correctly transform multiple work orders", () => {
    const inputMap = new Map<string, CsvRow[]>();
    inputMap.set("WO-111", [
      {
        order_ref: "WO-111",
        client_org_name: "Client A",
        client_contact_name: "CA",
        client_phone_num: "1",
        site_full_address: "A1",
        site_notes: "",
        job_date: "2025-08-02",
        job_time: "11:00",
        task_identifier: "T1",
        task_description: "D1",
        task_hours_estimate: 1,
      },
    ]);
    inputMap.set("WO-222", [
      {
        order_ref: "WO-222",
        client_org_name: "Client B",
        client_contact_name: "CB",
        client_phone_num: "2",
        site_full_address: "A2",
        site_notes: "N2",
        job_date: "2025-08-03",
        job_time: "12:00",
        task_identifier: "T2",
        task_description: "D2",
        task_hours_estimate: 2,
      },
    ]);

    const result = transformToApiFormat(inputMap);

    expect(result).toHaveLength(2);
    expect(
      result.find((wo) => wo.customerReference === "WO-111")
    ).toBeDefined();
    expect(
      result.find((wo) => wo.customerReference === "WO-222")
    ).toBeDefined();
    expect(
      result.find((wo) => wo.customerReference === "WO-222")?.client.name
    ).toBe("Client B");
  });

  it("should return an empty array if input map is empty", () => {
    const inputMap = new Map<string, CsvRow[]>();
    const result = transformToApiFormat(inputMap);
    expect(result).toEqual([]);
  });

  it("should skip a work order if its date/time is invalid and causes an error during transformation", () => {
    const inputMap = new Map<string, CsvRow[]>();
    inputMap.set("WO-GOOD", [
      {
        order_ref: "WO-GOOD",
        client_org_name: "Client G",
        client_contact_name: "CG",
        client_phone_num: "G",
        site_full_address: "AG",
        site_notes: "",
        job_date: "2025-08-04",
        job_time: "13:00",
        task_identifier: "TG",
        task_description: "DG",
        task_hours_estimate: 1,
      },
    ]);
    inputMap.set("WO-BAD-DATE", [
      {
        order_ref: "WO-BAD-DATE",
        client_org_name: "Client BD",
        client_contact_name: "CBD",
        client_phone_num: "BD",
        site_full_address: "ABD",
        site_notes: "",
        job_date: "2025-08-05",
        job_time: "99:99",
        task_identifier: "TBD",
        task_description: "DBD",
        task_hours_estimate: 1,
      },
    ]);

    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const result = transformToApiFormat(inputMap);

    expect(result).toHaveLength(1);
    expect(result[0].customerReference).toBe("WO-GOOD");

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "[Transformer] Error during transformation for WO-BAD-DATE:"
      ),
      expect.objectContaining({
        message: expect.stringContaining(
          "Invalid date components (date: '2025-08-05', time: '99:99') for order WO-BAD-DATE"
        ),
      })
    );

    consoleSpy.mockRestore();
  });
});
