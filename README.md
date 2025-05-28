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
   git clone <repository-url>
   cd <repository-name>
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

Environment variables will be injected directly into the runtime environment by the hosting platform (e.g., AWS Elastic Beanstalk, Heroku, Kubernetes/Docker environment variables) or a secrets management service (e.g., AWS Secrets Manager, HashiCorp Vault, GitHub Secrets).

We will have distinct sets of variables for each environment:

- `PORT`: Port for the API server
- `NODE_ENV`: Set to `staging` or `production`
- `API_KEY`: Different, strong API keys for staging and production
- `API_BASE_URL`: The canonical URL for the API in that environment (e.g., `https://staging-api.example.com`, `https://api.example.com`)
- `SFTP_HOST`, `SFTP_USER`, `SFTP_PRIVATE_KEY_PATH` (or content): For a real SFTP setup, these would be securely managed
- Logging levels and external service URLs (if any) would also be environment-specific

> **Important:** Never commit `.env` files with production secrets to the repository.

### 2. Deployment Scripts (package.json)

The `package.json` includes the following relevant scripts:

- `"build": "tsc"`: Compiles the TypeScript project to JavaScript in the `dist/` directory. This is run by the CI/CD pipeline before deployment
- `"start:api": "node dist/api/server.js"`: Starts the API server from the compiled JavaScript. This would be used in production/staging, likely managed by a process manager like PM2 or the deployment platform's service manager
- `"dev:api": "ts-node src/api/server.ts"`: Runs the API using `ts-node` for local development, enabling live reloading
- `"migrate": "ts-node src/integration-service/service.ts"`: Runs the integration service locally using `ts-node` for testing the migration flow
- `"migrate:prod": "node dist/integration-service/service.js"` (Conceptual): This script would run the compiled integration service. It would typically be invoked as a scheduled task (e.g., cron job, AWS Lambda scheduled event, Kubernetes CronJob)
- `"test": "jest --detectOpenHandles"`: Runs all automated tests

### 3. CI/CD Pipeline (GitHub Actions)

We will use GitHub Actions to automate testing and deployment. A typical workflow (`.github/workflows/ci-cd.yml`) would include:

#### Branching Strategy (Assumed)

- `develop` branch: Code pushed here is deployed to the Staging environment
- `main` branch: Code merged here (typically from `develop` after successful staging tests) is deployed to the Production environment
- Feature branches: Created off `develop` for new features/fixes, merged back into `develop` via Pull Requests

#### Workflow Triggers

- On push to `develop` (for staging deployment)
- On push to `main` (for production deployment, possibly after a manual approval step)
- On pull requests targeting `develop` or `main` (to run tests)

#### Workflow Jobs & Steps

##### Lint & Test Job

Runs on pushes to all relevant branches & PRs:

1. `actions/checkout@vX`: Checks out the code
2. `actions/setup-node@vX`: Sets up the desired Node.js version
3. `npm ci`: Installs dependencies cleanly
4. `npm run lint` (Conceptual - if linters like ESLint/Prettier are configured): Checks code style
5. `npm test`: Runs all automated tests (unit, integration). If tests fail, the workflow fails, preventing deployment

##### Build Job

Runs if Lint & Test passes:

1. (Inherits from previous job or runs in parallel if dependencies are managed)
2. `npm run build`: Compiles TypeScript to JavaScript
3. (Optional) `docker build ...`: If containerising, build a Docker image
4. (Optional) Push Docker image to a registry (e.g., Docker Hub, AWS ECR, GitHub Container Registry)
5. Upload build artifacts (e.g., `dist` folder or Docker image ID) for deployment jobs

##### Deploy to Staging Job

Runs if Build passes, triggered by push to `develop`:

1. Download build artifacts
2. **Configure Staging Environment:**
   - Use GitHub Secrets to inject staging-specific environment variables (`STAGING_API_KEY`, `STAGING_API_URL`, SFTP details for staging if different)
3. **Deploy API:**
   - Could be via SSH & PM2, or platform-specific commands (e.g., `eb deploy` for Elastic Beanstalk, `heroku deploy`, `kubectl apply` for Kubernetes)
4. **Deploy/Configure Migration Service:**
   - If it's a scheduled task, update the task definition or code (e.g., update AWS Lambda function, update cron job script on a server)
5. (Optional) Run Smoke Tests/E2E Tests against the staging environment

##### Deploy to Production Job

Runs if Build passes, triggered by push/merge to `main`, potentially with manual approval:

1. (Optional) **Manual Approval Step:** Use GitHub Action's environment feature with required reviewers
2. Download build artifacts
3. **Configure Production Environment:**
   - Use GitHub Secrets for production-specific environment variables
4. **Deploy API:**
   - Similar deployment mechanisms as staging, but to the production infrastructure. Consider blue/green or canary deployment strategies for zero-downtime updates
5. **Deploy/Configure Migration Service:**
   - Update the production scheduled task
6. (Optional) Run Smoke Tests against the production environment

This CI/CD pipeline ensures that every change is automatically tested, built, and can be reliably deployed to staging for further verification before reaching production, minimising risks and improving development velocity.
