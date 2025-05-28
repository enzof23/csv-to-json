import * as sftp from "./sftp/sftpClient";
import * as parser from "./parser/csvProcessor";
import * as transformer from "./transformer/dataTransformer";
import * as apiClient from "./apiClient/apiClient";
import { WorkOrderInput } from "../api/validation/workOrderSchema";

const processFile = async (filename: string): Promise<boolean> => {
  console.log(`\n--- Processing File: ${filename} ---`);
  let allSubmissionsSucceeded = true;

  try {
    const csvContent = await sftp.downloadFileContent(filename);

    const groupedData = await parser.parseAndGroupCsv(csvContent);

    const workOrders: WorkOrderInput[] =
      transformer.transformToApiFormat(groupedData);

    if (workOrders.length === 0) {
      console.warn(
        `[Service] No valid work orders found in ${filename}. Moving to error for review.`
      );
      return false;
    }

    console.log(
      `[Service] Submitting ${workOrders.length} work orders from ${filename}...`
    );

    for (const order of workOrders) {
      try {
        await apiClient.submitWorkOrder(order);
      } catch (apiError) {
        console.error(
          `[Service] API submission FAILED for ${order.customerReference} from ${filename}.`
        );
        allSubmissionsSucceeded = false;
      }
    }

    return allSubmissionsSucceeded;
  } catch (error) {
    console.error(
      `[Service] CRITICAL error processing file ${filename}:`,
      error
    );
    return false;
  }
};

export const runMigration = async (): Promise<void> => {
  console.log("=======================================");
  console.log("Starting SFTP to API Migration Process...");
  console.log("=======================================");

  await sftp.initializeSftpDirs();

  const filesToProcess = await sftp.listCsvFiles();

  if (filesToProcess.length === 0) {
    console.log("No new CSV files found to process. Exiting.");
    return;
  }

  console.log(
    `Found ${filesToProcess.length} files. Starting processing loop...`
  );

  for (const file of filesToProcess) {
    const success = await processFile(file);

    if (success) {
      await sftp.moveFile(file, "processed");
      console.log(`--- Finished Processing ${file} (Success) ---`);
    } else {
      await sftp.moveFile(file, "error");
      console.log(`--- Finished Processing ${file} (FAILED) ---`);
    }
  }

  console.log("=======================================");
  console.log("Migration Process Finished.");
  console.log("=======================================");
};

if (require.main === module) {
  runMigration().catch((err) => {
    console.error(
      "!!! A FATAL, UNHANDLED ERROR occurred during migration run !!!",
      err
    );
    process.exit(1);
  });
}
