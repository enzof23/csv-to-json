import { z } from "zod";

// Schema for a single Task
const taskSchema = z.object({
  taskCode: z
    .string({ required_error: "Task code is required" })
    .min(1, "Task code cannot be empty"),
  description: z
    .string({ required_error: "Task description is required" })
    .min(1, "Task description cannot be empty"),
  estimatedHours: z
    .number({ required_error: "Estimated hours are required" })
    .positive("Estimated hours must be a positive number"),
});

// Schema for Client details
const clientSchema = z.object({
  name: z.string().min(1, "Client name is required"),
  contactPerson: z.string().min(1, "Contact person is required"),
  phone: z.string().min(1, "Phone number is required"),
});

// Schema for Location details
const locationSchema = z.object({
  fullAddress: z.string().min(1, "Full address is required"),
  instructions: z.string().optional(),
});

// Schema for Job Details
const jobDetailsSchema = z.object({
  scheduledFor: z
    .string()
    .datetime({ message: "Invalid ISO 8601 datetime format for scheduledFor" }),
  tasks: z.array(taskSchema).min(1, "At least one task is required"),
});

// The main WorkOrder schema, combining all sub-schemas
export const workOrderSchema = z.object({
  customerReference: z.string().min(1, "Customer reference is required"),
  client: clientSchema,
  location: locationSchema,
  jobDetails: jobDetailsSchema,
});

export type WorkOrderInput = z.infer<typeof workOrderSchema>;
