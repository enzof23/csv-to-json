import * as fs from "fs/promises";
import * as path from "path";

const INPUT_DIR = "./sftp_input";
const PROCESSED_DIR = "./sftp_processed";
const ERROR_DIR = "./sftp_error";

// Ensure directories exist on startup
export const initializeSftpDirs = async (): Promise<void> => {
  try {
    await fs.mkdir(INPUT_DIR, { recursive: true });
    await fs.mkdir(PROCESSED_DIR, { recursive: true });
    await fs.mkdir(ERROR_DIR, { recursive: true });
    console.log("[SFTP] Input, Processed, and Error directories are ready.");
  } catch (error) {
    console.error(
      "[SFTP] Failed to create SFTP simulation directories:",
      error
    );
    throw error;
  }
};

export const listCsvFiles = async (): Promise<string[]> => {
  try {
    const allFiles = await fs.readdir(INPUT_DIR);
    const csvFiles = allFiles.filter((file) =>
      file.toLowerCase().endsWith(".csv")
    );
    console.log(`[SFTP] Found ${csvFiles.length} CSV files:`, csvFiles);
    return csvFiles;
  } catch (error) {
    console.error("[SFTP] Error listing CSV files:", error);
    return [];
  }
};

export const downloadFileContent = async (
  filename: string
): Promise<string> => {
  const filePath = path.join(INPUT_DIR, filename);
  try {
    const content = await fs.readFile(filePath, "utf-8");
    console.log(`[SFTP] 'Downloaded' (read) content from: ${filename}`);
    return content;
  } catch (error) {
    console.error(
      `[SFTP] Error 'downloading' (reading) file ${filename}:`,
      error
    );
    throw error;
  }
};

export const moveFile = async (
  filename: string,
  targetDir: "processed" | "error"
): Promise<void> => {
  const sourcePath = path.join(INPUT_DIR, filename);
  const destinationDir = targetDir === "processed" ? PROCESSED_DIR : ERROR_DIR;
  const destinationPath = path.join(destinationDir, filename);

  try {
    await fs.rename(sourcePath, destinationPath);
    console.log(`[SFTP] Moved ${filename} to ${destinationDir}`);
  } catch (error) {
    console.error(
      `[SFTP] Error moving file ${filename} to ${destinationDir}:`,
      error
    );
  }
};

initializeSftpDirs();
