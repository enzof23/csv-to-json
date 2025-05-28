# Backend Developer Coding Assessment: SFTP (CSV) to API Data Migration 🛠️

## Introduction

Welcome! This assessment evaluates your skills in building robust backend integration solutions. You'll tackle a common challenge: migrating data from a legacy **SFTP-based CSV feed** to a modern, **secure RESTful API**. The task emphasizes data parsing, transformation (including handling data relationships), API development, testing, and deployment planning.

## Scenario

"Rapid Deploy Services" currently receives daily work orders from its partners via **CSV files** deposited onto an **SFTP server**. They need to modernize this process. Your mission is to:

1.  Build a **new Work Order API** capable of receiving structured job data.
2.  Build an **Integration Service** that:
    - Fetches CSV files from the SFTP server (simulated locally).
    - Parses and transforms the CSV data (including grouping related data).
    - Submits the transformed data to the new Work Order API.

## Technical Requirements

- **Language/Framework:** Node.js & Express.js.
- **SFTP Simulation:** We'll simulate SFTP by reading from a local directory (e.g., `./sftp_input/`). You _don't_ need a real SFTP server/client, but you should structure your code as if you were interacting with one (e.g., functions for `list_files`, `download_file`, `move_file`).
- **Data Parsing:** Use a reliable Node.js library for CSV parsing.
- **Data Storage (API):** An in-memory store (e.g., an array or Map) is sufficient.
- **Testing:** Jest, Mocha/Chai, etc., with Supertest for API testing.

---

## Tasks

### Part 1: The Target Work Order API

Build the Express.js REST API.

1.  **Authentication:**

    - The API _must_ require an `X-Api-Key` header.
    - Implement a simple middleware to check for a predefined API key (e.g., `SECRET_API_KEY_123`).
    - Return `401 Unauthorized` for missing/incorrect keys.

2.  **API Endpoint:**

    - `POST /api/v1/work-orders`

3.  **Request Body (JSON):** This API expects a _structured_ JSON payload. Notice it represents _one_ work order, potentially with _multiple_ tasks.

    ```json
    {
      "customerReference": "string", // e.g., "WO-2025-001"
      "client": {
        "name": "string", // e.g., "Global Retail Ltd."
        "contactPerson": "string", // e.g., "Jane Smith"
        "phone": "string" // e.g., "0287654321"
      },
      "location": {
        "fullAddress": "string", // e.g., "456 George St, Sydney, NSW 2000"
        "instructions": "string" // e.g., "Use loading dock B, contact security."
      },
      "jobDetails": {
        "scheduledFor": "string", // ISO 8601, e.g., "2025-06-15T09:00:00Z"
        "tasks": [
          {
            "taskCode": "string", // e.g., "INSTALL-01"
            "description": "string", // e.g., "Set up Point-of-Sale Terminal"
            "estimatedHours": "number" // e.g., 2.5
          }
        ]
      }
    }
    ```

4.  **Responses:**

    - `201 Created`: Success. Respond with the created work order.
    - `400 Bad Request`: Invalid payload. Include error details.
    - `401 Unauthorized`: Authentication errors.
    - `500 Internal Server Error`: Server issues.

5.  **Functionality:**
    - Implement auth middleware.
    - Validate incoming JSON.
    - "Store" data in memory.
    - Implement basic logging.

---

### Part 2: The SFTP Integration Service

This service processes the CSV files and calls the API.

1.  **SFTP Source Simulation (`./sftp_input/`):**

    - Assume CSV files land here.
    - **CSV File Format:** **Important:** Each row represents _one task_ within a work order. Work order details are repeated.
      - Header: `order_ref,client_org_name,client_contact_name,client_phone_num,site_full_address,site_notes,job_date,job_time,task_identifier,task_description,task_hours_estimate`
      - Example Data:
        ```csv
        WO-2025-001,Global Retail Ltd.,Jane Smith,0287654321,"456 George St, Sydney, NSW 2000","Use loading dock B",2025-06-15,09:00,INSTALL-01,"Set up Point-of-Sale Terminal",2.5
        WO-2025-001,Global Retail Ltd.,Jane Smith,0287654321,"456 George St, Sydney, NSW 2000","Use loading dock B",2025-06-15,09:00,TEST-NETWORK,"Verify network connectivity",1
        WO-2025-002,Corner Cafe Pty Ltd,Bob Jones,0391234567,"789 Collins St, Melbourne, VIC 3000","Enter via laneway",2025-06-16,10:30,REPAIR-COFFEE,"Fix espresso machine",3
        ```
    - Create a few sample CSV files.

2.  **Migration Service Logic:**
    - **File Handling:** Scan `./sftp_input/` for `.csv` files. Implement logic to move processed files (e.g., to `./sftp_processed/`) to prevent re-runs.
    - **CSV Parsing:** Parse the data.
    - **Data Aggregation & Transformation:**
      - **Group rows** by `order_ref`. Since each CSV row is a task, you need to collect all tasks belonging to the same `order_ref` before building a single JSON object.
      - Transform the flat CSV data into the **nested JSON structure** required by the API.
      - Combine `job_date` and `job_time` into an **ISO 8601** `scheduledFor` string.
      - Handle data type conversions.
    - **API Submission:** For each _aggregated_ work order (one JSON object), make a `POST` request to your API, including the `X-Api-Key` header.
    - **Error Handling & Logging:** Implement robust logging and handle potential errors during file access, parsing, transformation, and API calls.

---

### Part 3: Testing 🧪

1.  **API Integration Tests:**
    - Test the `POST /api/v1/work-orders` endpoint using Supertest.
    - Cover success (201), authentication (401), and validation (400) cases.
    - (Optional but Recommended) Add a `GET /api/v1/work-orders` endpoint for easier E2E verification.
2.  **Integration Service Tests:**
    - Test CSV parsing.
    - **Crucially, test the data aggregation and transformation logic.**
    - Test the API submission (mocking or hitting the real API).
3.  **End-to-End (E2E) Script:**
    - Create a script to automate a full run: Start API -> Place CSVs -> Run Service -> Verify API Data -> Clean up.

---

### Part 4: Deployment Strategy 🚀

In your `README.md`, describe your approach:

1.  **Environment Configuration:** How will you manage SFTP details (even if simulated), API URLs, API Keys for different environments? Discuss `.env` and environment variables.
2.  **Deployment Scripts:** Include `package.json` scripts (`start:prod`, `start:dev`, `test`, `migrate`).
3.  **CI/CD Pipeline (Conceptual):** Outline the steps for automated testing and deployment.

---

## Deliverables 📦

1.  **A Git repository** with all your code.
2.  **A `README.md` file** with:
    - Project overview.
    - **Setup and run instructions**.
    - Assumptions made.
    - Your **deployment strategy**.

---

## Evaluation Criteria 🌟

- **Functionality:** Does it meet requirements? Does data migrate correctly?
- **Code Quality:** Clean, structured, readable, maintainable?
- **API Design:** RESTful? Secure? Good validation?
- **Data Handling:** **Is CSV parsing and _aggregation_ handled robustly?**
- **Testing:** Comprehensive and meaningful?
- **Deployment Plan:** Clear and practical?
- **Node.js/Express.js Concepts:** Understanding demonstrated?
