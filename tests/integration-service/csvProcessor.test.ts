import { parseAndGroupCsv } from "../../src/integration-service/parser/csvProcessor";
import { CsvRow } from "../../src/integration-service/validation/csvSchema";

// --- Sample CSV Data ---

const validCsvContent = `order_ref,client_org_name,client_contact_name,client_phone_num,site_full_address,site_notes,job_date,job_time,task_identifier,task_description,task_hours_estimate
WO-001,Client A,Contact A,111,"Addr 1","Notes A",2025-01-10,09:00,TASK-01,Desc A1,1.5
WO-001,Client A,Contact A,111,"Addr 1","Notes A",2025-01-10,09:00,TASK-02,Desc A2,2.0
WO-002,Client B,Contact B,222,"Addr 2","",2025-01-11,11:30,TASK-03,Desc B1,3.0`;

const csvWithErrors = `order_ref,client_org_name,client_contact_name,client_phone_num,site_full_address,site_notes,job_date,job_time,task_identifier,task_description,task_hours_estimate
WO-003,Client C,Contact C,333,"Addr 3","",2025-01-12,10:00,TASK-04,Desc C1,4.0
,Client D,Contact D,444,"Addr 4","",2025-01-13,11:00,TASK-05,Desc D1,1.0
WO-004,Client E,Contact E,555,"Addr 5","",2025-01-14,12:00,TASK-06,Desc E1,NOT_A_NUMBER
WO-005,Client F,Contact F,666,"Addr 6","",2025-01-15,13:00,TASK-07,Desc F1,5.0`;

const emptyCsvContent = `order_ref,client_org_name,client_contact_name,client_phone_num,site_full_address,site_notes,job_date,job_time,task_identifier,task_description,task_hours_estimate`;

// --- Test Suite ---

describe("CSV Processor (parseAndGroupCsv)", () => {
  it("should correctly parse and group a valid CSV string", async () => {
    const result = await parseAndGroupCsv(validCsvContent);

    expect(result.size).toBe(2); // WO-001 and WO-002

    expect(result.has("WO-001")).toBe(true);
    // Making CsvRow usage more explicit here:
    const wo1Rows: CsvRow[] | undefined = result.get("WO-001");
    expect(wo1Rows).toBeDefined();
    expect(wo1Rows).toHaveLength(2);
    expect(wo1Rows?.[0].client_org_name).toBe("Client A");
    expect(wo1Rows?.[1].task_identifier).toBe("TASK-02");
    expect(wo1Rows?.[1].task_hours_estimate).toBe(2.0);

    expect(result.has("WO-002")).toBe(true);
    const wo2Rows: CsvRow[] | undefined = result.get("WO-002");
    expect(wo2Rows).toBeDefined();
    expect(wo2Rows).toHaveLength(1);
    expect(wo2Rows?.[0].task_hours_estimate).toBe(3.0);
  });

  it("should skip invalid rows and log warnings", async () => {
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const result = await parseAndGroupCsv(csvWithErrors);

    expect(result.size).toBe(2);
    expect(result.has("WO-003")).toBe(true);
    expect(result.has("WO-005")).toBe(true);
    expect(result.has("WO-004")).toBe(false);
    expect(result.has("")).toBe(false);
    expect(consoleSpy).toHaveBeenCalledTimes(2);

    consoleSpy.mockRestore();
  });

  it("should return an empty map for an empty or header-only CSV", async () => {
    const result1 = await parseAndGroupCsv(emptyCsvContent);
    expect(result1.size).toBe(0);

    const result2 = await parseAndGroupCsv("");
    expect(result2.size).toBe(0);
  });

  it("should handle CSVs with only one data row", async () => {
    const singleRowCsv = `order_ref,client_org_name,client_contact_name,client_phone_num,site_full_address,site_notes,job_date,job_time,task_identifier,task_description,task_hours_estimate
WO-SINGLE,Client S,Contact S,777,"Addr S","",2025-01-16,14:00,TASK-S,Desc S1,6.0`;
    const result = await parseAndGroupCsv(singleRowCsv);
    expect(result.size).toBe(1);
    expect(result.has("WO-SINGLE")).toBe(true);
    expect(result.get("WO-SINGLE")).toHaveLength(1);
  });
});
