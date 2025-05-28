import dotenv from "dotenv";
dotenv.config();

interface AppConfig {
  port: number;
  apiKey: string;
  apiBaseUrl: string;
}

const config: AppConfig = {
  port: Number(process.env.PORT) || 3000,
  apiKey: process.env.API_KEY || "",
  apiBaseUrl: process.env.API_BASE_URL || "http://localhost:3000",
};

if (!config.apiKey) {
  console.error("FATAL ERROR: API_KEY environment variable is not set.");
  process.exit(1);
}

if (!config.apiBaseUrl) {
  console.error("FATAL ERROR: API_BASE_URL environment variable is not set.");
  process.exit(1);
}

export default config;
