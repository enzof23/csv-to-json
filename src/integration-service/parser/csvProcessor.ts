import { parse } from "csv-parse";
import { Readable } from "stream";
import { csvRowSchema, CsvRow } from "../validation/csvSchema";

export const parseAndGroupCsv = async (
  csvContent: string
): Promise<Map<string, CsvRow[]>> => {
  const groupedOrders = new Map<string, CsvRow[]>();

  const parser = parse({
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const stream = Readable.from(csvContent);
  let rowNumber = 1;

  console.log(
    "[CSV Parser] Starting CSV parsing, Zod validation, and grouping..."
  );

  try {
    for await (const record of stream.pipe(parser)) {
      rowNumber++;

      const validationResult = csvRowSchema.safeParse(record);

      if (!validationResult.success) {
        console.warn(
          `[CSV Parser] Skipping invalid row #${rowNumber}:`,
          validationResult.error.flatten()
        );
        continue;
      }

      const row: CsvRow = validationResult.data;

      const group = groupedOrders.get(row.order_ref);

      if (group) {
        group.push(row);
      } else {
        groupedOrders.set(row.order_ref, [row]);
      }
    }

    console.log(
      `[CSV Parser] Successfully processed rows and grouped ${groupedOrders.size} unique work orders.`
    );
    return groupedOrders;
  } catch (error) {
    console.error(
      `[CSV Parser] Critical error during CSV processing (around row ${rowNumber}):`,
      error
    );
    throw error;
  }
};
