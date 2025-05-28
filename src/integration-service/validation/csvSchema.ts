import { z } from "zod";

export const csvRowSchema = z.object({
  order_ref: z.string().min(1, "order_ref is required"),
  client_org_name: z.string().min(1, "client_org_name is required"),
  client_contact_name: z.string().min(1, "client_contact_name is required"),
  client_phone_num: z.string().min(1, "client_phone_num is required"),
  site_full_address: z.string().min(1, "site_full_address is required"),

  site_notes: z.string(),
  job_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid job_date format (YYYY-MM-DD)"),
  job_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Invalid job_time format (HH:MM)"),
  task_identifier: z.string().min(1, "task_identifier is required"),
  task_description: z.string().min(1, "task_description is required"),
  task_hours_estimate: z.coerce
    .number({
      invalid_type_error: "task_hours_estimate must be a number",
      required_error: "task_hours_estimate is required",
    })
    .positive("task_hours_estimate must be a positive number"),
});

export type CsvRow = z.infer<typeof csvRowSchema>;
