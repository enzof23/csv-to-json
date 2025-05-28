# SFTP (CSV) to API Data Migration 🛠️

## Project Overview

This project is a backend solution built for "Rapid Deploy Services" to modernise their work order ingestion process. It addresses the common challenge of migrating data from a legacy SFTP-based CSV feed to a new, secure RESTful API.

The solution consists of two main components:

1. A **new Work Order API** capable of receiving structured job data via JSON.
2. An **Integration Service** that fetches CSV files from a simulated SFTP server, parses and transforms the CSV data (including grouping related tasks into single work orders), and submits the transformed data to the new Work Order API.

The project is built using Node.js, Express.js, and TypeScript, emphasising robust data handling, API security, and a clear deployment strategy.

## Features

### Secure Work Order API

- Requires `X-Api-Key` header for authentication
- `POST /api/v1/work-orders` endpoint to create new work orders
- `GET /api/v1/work-orders` endpoint to retrieve all stored work orders
- In-memory data storage for API data
- Input validation using Zod

### SFTP Integration Service

- Simulates SFTP interaction using local directories (`./sftp_input/`, `./sftp_processed/`, `./sftp_error/`)
- Parses CSV files using `csv-parse`
- Validates each CSV row using Zod
- Aggregates task rows into single work orders based on `order_ref`
- Transforms CSV data to the API's required JSON structure, including ISO 8601 date conversion
- Submits data to the Work Order API using the native `fetch` API
- Handles file movement to prevent reprocessing and isolate errors

### Development & Testing

- Written in TypeScript for type safety
- Unit and integration tests using Jest and Supertest
- Includes API tests, CSV processing tests, and data transformation tests
- E2E test script to validate the full migration flow

## Project Structure

The project is organised into the following main directories:

```
├── src/                          # Contains the source code
│   ├── api/                      # Express.js Work Order API
│   │   ├── controllers/          # Route controllers
│   │   ├── routes/               # API routes
│   │   ├── middleware/           # Custom middleware
│   │   ├── store/                # Data storage
│   │   └── validation/           # Input validation schemas
│   ├── integration-service/      # CSV migration service
│   │   ├── sftp-client/          # SFTP simulation
│   │   ├── parser/               # CSV parsing logic
│   │   ├── transformer/          # Data transformation
│   │   ├── api-client/           # API communication
│   │   └── validation/           # Data validation
│   └── config/                   # Configuration loading
├── tests/                        # All test files
│   ├── api/                      # API integration tests
│   ├── integration-service/      # Service unit/integration tests
│   └── e2e/                      # End-to-end tests
├── sftp_input/                   # Simulated SFTP input directory
├── sftp_processed/               # Successfully processed files
├── sftp_error/                   # Failed processing files
└── .github/workflows/            # GitHub Actions workflow files
```

## Setup and Run Instructions

### Prerequisites

- Node.js (v18.x or later recommended for native `fetch`)
- npm (usually comes with Node.js)

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/enzof23/csv-to-json.git
   cd csv-to-json
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

### Environment Configuration

1. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

2. Open the `.env` file and configure the variables as needed:
   - `PORT`: The port the Work Order API will run on (default: `3000`)
   - `API_KEY`: The secret API key required by the API (default: `SECRET_API_KEY_123`)
   - `API_BASE_URL`: The base URL for the API (default: `http://localhost:3000` or the `PORT` you set)

### Running the Application

1. **Start the Work Order API:**

   Open a terminal and run:

   ```bash
   npm run dev:api
   ```

   The API will be running on the configured port (e.g., `http://localhost:3000`).

2. **Prepare CSV Files:**

   Place your CSV files (following the specified format) into the `./sftp_input/` directory. Example data is provided in the assessment instructions.

3. **Run the Integration Service:**

   Open _another_ terminal and run:

   ```bash
   npm run migrate
   ```

   The service will scan `./sftp_input/`, process the files, and attempt to submit data to the running API.

### Running Tests

To run all tests (API, integration service unit tests):

```bash
npm test
```

> **Note:** The E2E test script `tests/e2e/migration.e2e.test.ts` might require separate setup or be integrated into `npm test` if fully completed.

## Assumptions Made

- The SFTP server is simulated locally using the `./sftp_input/`, `./sftp_processed/`, and `./sftp_error/` directories
- CSV files adhere to the header and data structure defined in the assessment. Each CSV row represents a single task, and work order details are repeated across rows for the same order
- `job_date` and `job_time` fields in the CSV are combined and interpreted as UTC when forming the ISO 8601 `scheduledFor` string (e.g., `YYYY-MM-DDTHH:MM:SSZ`)
- The in-memory store for the Work Order API is sufficient for this assessment's scope
- If any error occurs during the processing of a CSV file (download, parse, transform, or any API submission from that file), the entire file is moved to the `sftp_error/` directory. Individual work order retries within a file are not implemented

## Deployment Strategy

This section outlines how the Work Order API and the SFTP Integration Service would be deployed and managed in staging and production environments, leveraging GitHub Actions for CI/CD.

### 1. Environment Configuration

#### Local Development

Uses `.env` files loaded by `dotenv` for variables like `PORT`, `API_KEY`, and `API_BASE_URL`.

#### Staging & Production Environments

Environment variables will be injected directly into the runtime environment by the hosting platform or a secrets management service. **GitHub Secrets** are used within the CI/CD pipeline to manage environment-specific variables for Staging and Production.

We will have distinct sets of variables for each environment:

- `PORT`: Port for the API server (`STAGING_PORT`, `PRODUCTION_PORT`)
- `NODE_ENV`: Set to `staging` or `production`
- `API_KEY`: Different, strong API keys (`STAGING_API_KEY`, `PRODUCTION_API_KEY`)
- `API_BASE_URL`: The canonical URL for the API (`STAGING_API_BASE_URL`, `PRODUCTION_API_BASE_URL`)
- `APP_URL`: The public URL of the deployed application (`STAGING_APP_URL`, `PRODUCTION_APP_URL`)
- (If using real SFTP) `SFTP_HOST`, `SFTP_USER`, etc., would also be managed via secrets.

> **Important:** Never commit `.env` files with production secrets to the repository.

### 2. Deployment Scripts (package.json)

The `package.json` includes the following relevant scripts:

- `"build": "tsc"`: Compiles the TypeScript project to JavaScript in the `dist/` directory.
- `"start:api": "node dist/api/server.js"`: Starts the API server from the compiled JavaScript, suitable for production/staging.
- `"dev:api": "ts-node src/api/server.ts"`: Runs the API using `ts-node` for local development.
- `"migrate": "ts-node src/integration-service/service.ts"`: Runs the integration service locally.
- `"test": "jest --detectOpenHandles"`: Runs all automated tests.

### 3. CI/CD Pipeline (GitHub Actions)

We use the GitHub Actions workflow defined in `.github/workflows/ci-cd.yml` to automate testing and deployment based on the following strategy:

#### Branching Strategy

- `develop` branch: Code pushed here is deployed to the Staging environment.
- `main` branch: Code pushed here is deployed to the Production environment.
- Pull Requests (targeting `develop` or `main`): Trigger the `lint_test` job.

#### Workflow Jobs & Steps

The pipeline consists of several jobs:

1.  **`lint_test` (Lint and Test)**:

    - **Trigger:** Runs on push to `main`/`develop` and on pull requests to these branches.
    - **Matrix:** Tests across multiple Node.js versions (18.x, 20.x).
    - **Steps:**
      - Checks out the code.
      - Sets up Node.js and caches npm dependencies.
      - Installs dependencies using `npm ci`.
      - Runs tests using `npm test` with test-specific environment variables (from secrets or defaults).
      - _(Includes a placeholder for a linting step, currently commented out)_.

2.  **`build` (Build Application)**:

    - **Trigger:** Runs after `lint_test` succeeds.
    - **Steps:**
      - Checks out the code.
      - Sets up Node.js (20.x) and installs dependencies.
      - Builds the TypeScript project (`npm run build`).
      - Archives the `dist/` folder, `package.json`, and `package-lock.json` as an artifact named `dist-files`.

3.  **`deploy_staging` (Deploy to Staging)**:

    - **Trigger:** Runs after `build` succeeds, but _only_ on a push event to the `develop` branch.
    - **Environment:** Uses the `staging` environment in GitHub (allowing for specific secrets and protection rules).
    - **Steps:**
      - Downloads the `dist-files` artifact.
      - Configures the staging environment by creating a `.env` file within the deployment package, populating it with `STAGING_*` secrets.
      - Runs conceptual deployment commands (placeholders for actual deployment like `scp`, `eb deploy`, etc.), passing secrets as environment variables.

4.  **`deploy_production` (Deploy to Production)**:
    - **Trigger:** Runs after `build` succeeds, but _only_ on a push event to the `main` branch.
    - **Environment:** Uses the `production` environment in GitHub.
    - **Steps:**
      - Downloads the `dist-files` artifact.
      - Configures the production environment by creating a `.env` file, populating it with `PRODUCTION_*` secrets.
      - Runs conceptual deployment commands for production.

This CI/CD pipeline ensures that every change is automatically tested and built. It provides a clear path for deploying to staging for verification before releasing to production, enhancing reliability and development speed.
