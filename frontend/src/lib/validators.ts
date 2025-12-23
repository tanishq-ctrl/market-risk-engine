import { z } from "zod";

export const portfolioRowSchema = z.object({
  symbol: z.string().min(1, "Symbol cannot be empty"),
  weight: z.number().finite("Weight must be a finite number"),
  asset_type: z.string().optional(),
  display_name: z.string().optional(),
  price_field: z.enum(["Adj Close", "Close"]).optional(),
});

export const portfolioSchema = z
  .array(portfolioRowSchema)
  .min(1, "Portfolio must have at least one row");

export const backtestResponseSchema = z.object({
  exceptions_count: z.number(),
  exceptions_rate: z.number(),
  kupiec_lr: z.number().nullable().optional(),
  kupiec_pvalue: z.number().nullable().optional(),
  available_days: z.number(),
  series: z.object({
    dates: z.array(z.string()),
    realized: z.array(z.number()),
    var_threshold: z.array(z.number()),
    exceptions: z.array(z.boolean()).optional(),
  }),
  exceptions_table: z
    .array(
      z.object({
        date: z.string(),
        realized: z.number(),
        var_threshold: z.number(),
      })
    )
    .optional(),
});

export const dateRangeSchema = z
  .object({
    start: z.string().min(1, "Start date is required"),
    end: z.string().min(1, "End date is required"),
  })
  .refine((data) => new Date(data.start) < new Date(data.end), {
    message: "Start date must be before end date",
    path: ["end"],
  });

export type PortfolioRowFormData = z.infer<typeof portfolioRowSchema>;
export type PortfolioFormData = z.infer<typeof portfolioSchema>;
export type DateRangeFormData = z.infer<typeof dateRangeSchema>;
export type BacktestResponseSchema = z.infer<typeof backtestResponseSchema>;

