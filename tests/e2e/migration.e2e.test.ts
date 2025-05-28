import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import fs from "fs/promises";
import path from "path";

const API_PORT = 3001;
const API_BASE_URL = `http://localhost:${API_PORT}`;
const API_KEY = "SECRET_API_KEY_123";

const ROOT_DIR = path.resolve(__dirname, "../../");
const SFTP_INPUT_DIR = path.resolve(ROOT_DIR, "sftp_input");
const SFTP_PROCESSED_DIR = path.resolve(ROOT_DIR, "sftp_processed");
const SFTP_ERROR_DIR = path.resolve(ROOT_DIR, "sftp_error");
const SAMPLE_DATA_DIR = path.resolve(__dirname, "./sample-data");
const SAMPLE_CSV = "work_orders_e2e.csv";

const TS_NODE_PATH =
  path.resolve(ROOT_DIR, "node_modules/.bin/ts-node") +
  (process.platform === "win32" ? ".cmd" : "");
const API_SERVER_PATH = path.resolve(ROOT_DIR, "src/api/server.ts");
const MIGRATION_SCRIPT_PATH = path.resolve(
  ROOT_DIR,
  "src/integration-service/service.ts"
);

let apiProcess: ChildProcessWithoutNullStreams | null = null;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function ensureDirExists(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {}
}

async function cleanupDirs() {
  await fs.rm(SFTP_INPUT_DIR, { recursive: true, force: true });
  await fs.rm(SFTP_PROCESSED_DIR, { recursive: true, force: true });
  await fs.rm(SFTP_ERROR_DIR, { recursive: true, force: true });
  await ensureDirExists(SFTP_INPUT_DIR);
  await ensureDirExists(SFTP_PROCESSED_DIR);
  await ensureDirExists(SFTP_ERROR_DIR);
}

async function setupTestFile() {
  await fs.copyFile(
    path.join(SAMPLE_DATA_DIR, SAMPLE_CSV),
    path.join(SFTP_INPUT_DIR, SAMPLE_CSV)
  );
}

async function isApiReady(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/`);
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

function startApi(): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log("Starting API...");
    const command = TS_NODE_PATH;
    const args = [API_SERVER_PATH];
    const options = {
      env: { ...process.env, PORT: `${API_PORT}`, API_KEY: API_KEY },
    };

    if (process.platform === "win32") {
      apiProcess = spawn("cmd.exe", ["/c", command, ...args], options);
    } else {
      apiProcess = spawn(command, args, options);
    }

    let resolved = false;

    apiProcess.stdout.on("data", (data) => {
      console.log(`API_STDOUT: ${data.toString().trim()}`);
      if (
        data
          .toString()
          .includes(`Work Order API listening on http://localhost:${API_PORT}`)
      ) {
        console.log("API seems ready based on stdout.");
        delay(2500).then(async () => {
          let ready = false;
          for (let i = 0; i < 25; i++) {
            ready = await isApiReady();
            if (ready) {
              console.log("API confirmed ready by polling.");
              if (!resolved) {
                resolved = true;
                resolve();
              }
              return;
            }
            await delay(1000);
          }
          if (!resolved) {
            resolved = true;
            reject(new Error("API did not become ready in time."));
          }
        });
      }
    });

    apiProcess.stderr.on("data", (data) =>
      console.error(`API_STDERR: ${data.toString().trim()}`)
    );
    apiProcess.on(
      "error",
      (err) => !resolved && ((resolved = true), reject(err))
    );
    apiProcess.on(
      "close",
      (code) =>
        !resolved &&
        code !== 0 &&
        ((resolved = true), reject(new Error(`API exited: ${code}`)))
    );
    setTimeout(
      () =>
        !resolved &&
        ((resolved = true), reject(new Error("API start timed out"))),
      65000
    );
  });
}

function stopApi(): Promise<void> {
  return new Promise((resolve) => {
    if (!apiProcess || !apiProcess.pid || apiProcess.killed) {
      console.log("API process not running, already stopped, or PID missing.");
      apiProcess = null;
      resolve();
      return;
    }

    const pidToKill = apiProcess.pid;
    console.log(`Attempting to stop API process with PID: ${pidToKill}`);

    const tempApiProcess = apiProcess;
    apiProcess = null;

    if (process.platform === "win32") {
      console.log(`Using taskkill for PID: ${pidToKill} on Windows.`);
      const taskkillProcess = spawn("taskkill", [
        "/PID",
        pidToKill.toString(),
        "/F",
        "/T",
      ]);

      let taskkillFinished = false;
      const taskkillTimeout = setTimeout(() => {
        if (!taskkillFinished) {
          console.warn(
            `taskkill for PID ${pidToKill} timed out after 5s. Resolving anyway.`
          );
          taskkillFinished = true;
          resolve();
        }
      }, 5000);

      taskkillProcess.on("exit", (code) => {
        if (!taskkillFinished) {
          clearTimeout(taskkillTimeout);
          taskkillFinished = true;
          console.log(
            `taskkill for PID ${pidToKill} exited with code: ${code}.`
          );
          resolve();
        }
      });
      taskkillProcess.on("error", (err) => {
        if (!taskkillFinished) {
          clearTimeout(taskkillTimeout);
          taskkillFinished = true;
          console.error(`taskkill for PID ${pidToKill} failed:`, err);
          resolve();
        }
      });
    } else {
      console.log(`Sending SIGKILL to PID: ${pidToKill} on non-Windows.`);
      if (tempApiProcess && !tempApiProcess.killed) {
        tempApiProcess.kill("SIGKILL");
      }
      setTimeout(resolve, 1000);
    }
  });
}

function runMigration(): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log("Running Migration Service...");
    const command = TS_NODE_PATH;
    const args = [MIGRATION_SCRIPT_PATH];
    const options = {
      env: { ...process.env, API_BASE_URL: API_BASE_URL, API_KEY: API_KEY },
    };

    const migrationProcess =
      process.platform === "win32"
        ? spawn("cmd.exe", ["/c", command, ...args], options)
        : spawn(command, args, options);

    migrationProcess.stdout.on("data", (data) =>
      console.log(`MIGRATE_STDOUT: ${data.toString().trim()}`)
    );
    migrationProcess.stderr.on("data", (data) =>
      console.error(`MIGRATE_STDERR: ${data.toString().trim()}`)
    );
    migrationProcess.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`Migration failed: ${code}`))
    );
    migrationProcess.on("error", (err) => reject(err));
  });
}

describe("End-to-End SFTP to API Migration", () => {
  jest.setTimeout(100000);

  beforeAll(async () => {
    await cleanupDirs();
    await setupTestFile();
    await startApi();
  });

  afterAll(async () => {
    await stopApi();
  });

  it("should process the CSV file, move it, and populate the API", async () => {
    let inputFiles = await fs.readdir(SFTP_INPUT_DIR);
    expect(inputFiles).toContain(SAMPLE_CSV);
    let processedFiles = await fs.readdir(SFTP_PROCESSED_DIR);
    expect(processedFiles).toHaveLength(0);

    await runMigration();

    inputFiles = await fs.readdir(SFTP_INPUT_DIR);
    expect(inputFiles).toHaveLength(0);
    processedFiles = await fs.readdir(SFTP_PROCESSED_DIR);
    expect(processedFiles).toContain(SAMPLE_CSV);

    const response = await fetch(`${API_BASE_URL}/api/v1/work-orders`, {
      headers: { "X-Api-Key": API_KEY },
    });
    expect(response.status).toBe(200);
    const workOrders: any = await response.json();

    expect(workOrders).toHaveLength(2);

    const order1 = workOrders.find(
      (wo: any) => wo.customerReference === "E2E-001"
    );
    expect(order1).toBeDefined();
    expect(order1.client.name).toBe("E2E Test Corp");
    expect(order1.jobDetails.scheduledFor).toBe("2025-10-01T10:00:00.000Z");
    expect(order1.jobDetails.tasks).toHaveLength(2);

    const order2 = workOrders.find(
      (wo: any) => wo.customerReference === "E2E-002"
    );
    expect(order2).toBeDefined();
    expect(order2.client.name).toBe("Another Client");
    expect(order2.jobDetails.tasks).toHaveLength(1);
  });
});
