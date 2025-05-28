import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import fs from "fs/promises";
import path from "path";

// --- Configuration ---
const API_PORT = process.env.PORT || 3001; // Use a different port to avoid clashes
const API_URL = `http://localhost:${API_PORT}`;
const API_KEY = process.env.API_KEY || "SECRET_API_KEY_123";

const ROOT_DIR = path.resolve(__dirname, "../../");
const SFTP_INPUT_DIR = path.resolve(ROOT_DIR, "sftp_input");
const SFTP_PROCESSED_DIR = path.resolve(ROOT_DIR, "sftp_processed");
const SAMPLE_DATA_DIR = path.resolve(__dirname, "./sample-data");
const SAMPLE_CSV = "work_orders_e2e.csv";

const TS_NODE_PATH = path.resolve(ROOT_DIR, "node_modules/.bin/ts-node");
const API_SERVER_PATH = path.resolve(ROOT_DIR, "src/api/server.ts");
const MIGRATION_SCRIPT_PATH = path.resolve(
  ROOT_DIR,
  "src/integration/migrate.ts"
);

let apiProcess: ChildProcessWithoutNullStreams | null = null;

// --- Helper Functions ---

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function ensureDirExists(dir: string) {
  try {
    await fs.access(dir);
  } catch (error) {
    await fs.mkdir(dir, { recursive: true });
  }
}

async function cleanupDirs() {
  await fs.rm(SFTP_INPUT_DIR, { recursive: true, force: true });
  await fs.rm(SFTP_PROCESSED_DIR, { recursive: true, force: true });
  await ensureDirExists(SFTP_INPUT_DIR);
  await ensureDirExists(SFTP_PROCESSED_DIR);
}

async function setupTestFile() {
  await fs.copyFile(
    path.join(SAMPLE_DATA_DIR, SAMPLE_CSV),
    path.join(SFTP_INPUT_DIR, SAMPLE_CSV)
  );
}

async function isApiReady(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/v1/work-orders`, {
      headers: { "X-Api-Key": API_KEY },
    });
    // We expect 200 OK for GET, even if empty
    return response.status === 200;
  } catch (error) {
    // console.warn("API not ready yet, retrying...", error);
    return false;
  }
}

function startApi(): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log("Starting API...");
    apiProcess = spawn(TS_NODE_PATH, [API_SERVER_PATH], {
      env: { ...process.env, PORT: `${API_PORT}`, API_KEY: API_KEY },
      // detached: true // Helps in killing process group later if needed
    });

    apiProcess.stdout.on("data", (data) => {
      console.log(`API_STDOUT: ${data.toString().trim()}`);
      // Check for a specific message indicating readiness
      if (data.toString().includes(`Server listening on port ${API_PORT}`)) {
        console.log("API seems ready based on stdout.");
        // Wait a bit more and then poll
        delay(1000).then(async () => {
          let ready = false;
          for (let i = 0; i < 10; i++) {
            // Try 10 times
            ready = await isApiReady();
            if (ready) {
              console.log("API confirmed ready by polling.");
              resolve();
              return;
            }
            await delay(500); // Wait 0.5s between polls
          }
          reject(new Error("API did not become ready in time."));
        });
      }
    });

    apiProcess.stderr.on("data", (data) => {
      console.error(`API_STDERR: ${data.toString().trim()}`);
      // We might reject early if a critical error occurs
    });

    apiProcess.on("error", (err) => {
      console.error("Failed to start API process.", err);
      reject(err);
    });

    apiProcess.on("close", (code) => {
      if (code !== 0 && code !== null) {
        console.warn(`API process exited with code ${code}`);
        // Don't reject if it's already resolving/rejected
      }
    });

    // Failsafe timeout
    setTimeout(() => {
      reject(new Error("API start timed out"));
    }, 30000); // 30 seconds timeout
  });
}

function stopApi(): Promise<void> {
  return new Promise((resolve) => {
    if (!apiProcess || apiProcess.killed) {
      console.log("API already stopped or never started.");
      resolve();
      return;
    }
    console.log("Stopping API...");
    apiProcess.kill("SIGTERM"); // Send termination signal
    apiProcess.on("close", () => {
      console.log("API process stopped.");
      apiProcess = null;
      resolve();
    });
    // Failsafe kill
    setTimeout(() => {
      if (apiProcess && !apiProcess.killed) {
        console.warn("API didn't stop gracefully, forcing kill.");
        apiProcess.kill("SIGKILL");
        apiProcess = null;
        resolve();
      }
    }, 5000);
  });
}

function runMigration(): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log("Running Migration Service...");
    const migrationProcess = spawn(TS_NODE_PATH, [MIGRATION_SCRIPT_PATH], {
      env: { ...process.env, API_URL: API_URL, API_KEY: API_KEY },
    });

    migrationProcess.stdout.on("data", (data) => {
      console.log(`MIGRATE_STDOUT: ${data.toString().trim()}`);
    });

    migrationProcess.stderr.on("data", (data) => {
      console.error(`MIGRATE_STDERR: ${data.toString().trim()}`);
    });

    migrationProcess.on("close", (code) => {
      if (code === 0) {
        console.log("Migration finished successfully.");
        resolve();
      } else {
        console.error(`Migration failed with code ${code}.`);
        reject(new Error(`Migration failed with code ${code}.`));
      }
    });

    migrationProcess.on("error", (err) => {
      console.error("Failed to start migration process.", err);
      reject(err);
    });
  });
}

// --- The Test Suite ---

describe("End-to-End SFTP to API Migration", () => {
  // Increase Jest timeout for E2E tests
  jest.setTimeout(60000); // 60 seconds

  beforeAll(async () => {
    await cleanupDirs();
    await setupTestFile();
    await startApi();
  });

  afterAll(async () => {
    await stopApi();
    // await cleanupDirs(); // Optional: keep files for inspection
  });

  it("should process the CSV file, move it, and populate the API", async () => {
    // 1. Check initial state
    let inputFiles = await fs.readdir(SFTP_INPUT_DIR);
    expect(inputFiles).toContain(SAMPLE_CSV);
    let processedFiles = await fs.readdir(SFTP_PROCESSED_DIR);
    expect(processedFiles).toHaveLength(0);

    // 2. Run the migration
    await runMigration();

    // 3. Check file system state after migration
    inputFiles = await fs.readdir(SFTP_INPUT_DIR);
    expect(inputFiles).toHaveLength(0);
    processedFiles = await fs.readdir(SFTP_PROCESSED_DIR);
    expect(processedFiles[0]).toMatch(new RegExp(`^${SAMPLE_CSV}_\\d{14}$`)); // Check for renamed file

    // 4. Check API state
    const response = await fetch(`${API_URL}/api/v1/work-orders`, {
      headers: { "X-Api-Key": API_KEY },
    });
    expect(response.status).toBe(200);
    const workOrders = await response.json();

    // 5. Verify the data
    expect(workOrders).toHaveLength(2);

    const order1 = workOrders.find(
      (wo: any) => wo.customerReference === "E2E-001"
    );
    expect(order1).toBeDefined();
    expect(order1.client.name).toBe("E2E Test Corp");
    expect(order1.location.fullAddress).toBe("1 Test St, Sydney, NSW 2000");
    expect(order1.jobDetails.scheduledFor).toBe("2025-10-01T10:00:00.000Z");
    expect(order1.jobDetails.tasks).toHaveLength(2);
    expect(order1.jobDetails.tasks[0].taskCode).toBe("TASK-A");
    expect(order1.jobDetails.tasks[1].taskCode).toBe("TASK-B");

    const order2 = workOrders.find(
      (wo: any) => wo.customerReference === "E2E-002"
    );
    expect(order2).toBeDefined();
    expect(order2.client.name).toBe("Another Client");
    expect(order2.jobDetails.scheduledFor).toBe("2025-10-02T11:30:00.000Z");
    expect(order2.jobDetails.tasks).toHaveLength(1);
    expect(order2.jobDetails.tasks[0].taskCode).toBe("TASK-C");
  });
});
