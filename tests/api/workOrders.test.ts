import request from "supertest";
import app from "../../src/api/app";
import {
  clearWorkOrders,
  getAllWorkOrders,
} from "../../src/api/store/memoryStore";
import config from "../../src/config";
import { WorkOrderInput } from "../../src/api/validation/workOrderSchema";

const VALID_API_KEY = config.apiKey;

const validPayload: WorkOrderInput = {
  customerReference: "TEST-WO-001",
  client: {
    name: "Test Client Inc.",
    contactPerson: "Testy McTestface",
    phone: "0199998888",
  },
  location: {
    fullAddress: "1 Test St, Testville, TS 12345",
    instructions: "Ring bell twice.",
  },
  jobDetails: {
    scheduledFor: "2025-10-26T11:00:00.000Z", // Use full ISO 8601
    tasks: [
      {
        taskCode: "TEST-01",
        description: "Run tests",
        estimatedHours: 1.5,
      },
    ],
  },
};

describe("Work Order API (/api/v1/work-orders)", () => {
  beforeEach(() => {
    clearWorkOrders();
  });

  describe("POST /api/v1/work-orders", () => {
    it("should return 401 Unauthorized if no API key is provided", async () => {
      const response = await request(app)
        .post("/api/v1/work-orders")
        .send(validPayload);

      expect(response.status).toBe(401);
      expect(response.body.message).toContain("X-Api-Key header is missing");
    });

    it("should return 401 Unauthorized if the wrong API key is provided", async () => {
      const response = await request(app)
        .post("/api/v1/work-orders")
        .set("X-Api-Key", "THIS_IS_WRONG")
        .send(validPayload);

      expect(response.status).toBe(401);
      expect(response.body.message).toContain("Invalid X-Api-Key");
    });

    it("should return 400 Bad Request if the payload is invalid", async () => {
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const invalidPayload = { ...validPayload, customerReference: "" };

      const response = await request(app)
        .post("/api/v1/work-orders")
        .set("X-Api-Key", VALID_API_KEY)
        .send(invalidPayload);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Bad Request");
      expect(response.body.details.fieldErrors.customerReference).toBeDefined();

      consoleSpy.mockRestore();
    });

    it("should return 201 Created and the new work order if payload is valid", async () => {
      const response = await request(app)
        .post("/api/v1/work-orders")
        .set("X-Api-Key", VALID_API_KEY)
        .send(validPayload);

      expect(response.status).toBe(201);
      expect(response.body.customerReference).toBe(
        validPayload.customerReference
      );
      expect(response.body.client.name).toBe(validPayload.client.name);
      expect(response.body.receivedAt).toBeDefined();

      const store = getAllWorkOrders();
      expect(store.length).toBe(1);
      expect(store[0].customerReference).toBe(validPayload.customerReference);
    });
  });

  describe("GET /api/v1/work-orders", () => {
    it("should return 401 Unauthorized if no API key is provided", async () => {
      const response = await request(app).get("/api/v1/work-orders");
      expect(response.status).toBe(401);
    });

    it("should return an empty array if no work orders have been added", async () => {
      const response = await request(app)
        .get("/api/v1/work-orders")
        .set("X-Api-Key", VALID_API_KEY);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it("should return an array with added work orders", async () => {
      await request(app)
        .post("/api/v1/work-orders")
        .set("X-Api-Key", VALID_API_KEY)
        .send(validPayload)
        .expect(201);

      const response = await request(app)
        .get("/api/v1/work-orders")
        .set("X-Api-Key", VALID_API_KEY);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].customerReference).toBe(
        validPayload.customerReference
      );
    });
  });
});
