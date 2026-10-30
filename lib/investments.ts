import { z } from "zod";
import { isDateKey } from "./calendar";

export const INVESTMENT_TYPES = ["sip", "mutual-fund", "fixed-deposit", "recurring-deposit", "ppf", "epf", "nps", "stocks", "etf", "bonds", "gold", "real-estate", "health-insurance", "life-insurance", "other"] as const;
export type InvestmentType = typeof INVESTMENT_TYPES[number];
export const INVESTMENT_LABELS: Record<InvestmentType, string> = { sip: "Mutual fund · SIP", "mutual-fund": "Mutual fund · lump sum", "fixed-deposit": "Fixed deposit", "recurring-deposit": "Recurring deposit", ppf: "PPF", epf: "EPF", nps: "NPS", stocks: "Stocks", etf: "ETF / index fund", bonds: "Bonds", gold: "Gold", "real-estate": "Real estate", "health-insurance": "Health insurance", "life-insurance": "Life insurance / LIC", other: "Other investment" };
export const INVESTMENT_STATUSES = ["active", "paused", "completed"] as const;
export const CONTRIBUTION_FREQUENCIES = ["none", "monthly", "quarterly", "yearly"] as const;
export const INVESTMENT_CURRENCIES = ["₹", "$", "€", "£", "¥", "₺"] as const;
export const isInsurance = (type: string) => type === "health-insurance" || type === "life-insurance";
const id = z.string().regex(/^[a-f0-9]{24}$/);
const date = z.string().refine((value) => isDateKey(value) && value >= "1900-01-01" && value <= "2200-12-31", "Enter a valid date between 1900 and 2200");
// Store money as integer minor units; never accept floating-point cents.
const cents = z.number().int().min(0).max(100_000_000_000);
export const investmentSchema = z.object({
  name: z.string().trim().min(1).max(80).refine((value) => !/[0-9]{7}/.test(value.replace(/[\s-]/g, "")) && !value.includes("@") && !/\b[A-Z]{5}[0-9]{4}[A-Z]\b/i.test(value), "Use a nickname without account numbers, policy numbers or email addresses"),
  type: z.enum(INVESTMENT_TYPES), status: z.enum(INVESTMENT_STATUSES), currency: z.enum(INVESTMENT_CURRENCIES),
  investedCents: cents, currentValueCents: cents.nullable(), contributionCents: cents.nullable(), frequency: z.enum(CONTRIBUTION_FREQUENCIES),
  startDate: date, maturityDate: date.nullable(),
}).strict().superRefine((value, ctx) => {
  if (value.maturityDate && value.maturityDate < value.startDate) ctx.addIssue({ code: "custom", path: ["maturityDate"], message: "Must be on or after the start date" });
  if (isInsurance(value.type) && value.currentValueCents !== null) ctx.addIssue({ code: "custom", path: ["currentValueCents"], message: "Insurance is tracked separately from investment value" });
  if (value.frequency !== "none" && (!value.contributionCents || value.contributionCents <= 0)) ctx.addIssue({ code: "custom", path: ["contributionCents"], message: "Enter a positive recurring amount" });
  if (value.frequency === "none" && value.contributionCents !== null) ctx.addIssue({ code: "custom", path: ["contributionCents"], message: "Choose a contribution frequency" });
});
export const investmentUpdateSchema = z.object({ id, record: investmentSchema }).strict();
export const investmentDeleteSchema = z.object({ id }).strict();
export const investmentQuerySchema = z.object({
  type: z.enum(INVESTMENT_TYPES).optional(), status: z.enum(INVESTMENT_STATUSES).optional(), currency: z.enum(INVESTMENT_CURRENCIES),
  q: z.string().trim().max(80).default(""),
  page: z.coerce.number().int().min(1).max(10000).default(1),
});
export type InvestmentInput = z.infer<typeof investmentSchema>;
export type InvestmentRecord = InvestmentInput & { id: string };
export type InvestmentSummary = { investedCents: number; valuedInvestedCents: number; currentValueCents: number; premiumsCents: number; valuedCount: number; investmentCount: number; insuranceCount: number };
export type InvestmentPage = { currency: string; records: InvestmentRecord[]; total: number; page: number; pages: number; summary: InvestmentSummary };
export const EMPTY_INVESTMENT_SUMMARY: InvestmentSummary = { investedCents: 0, valuedInvestedCents: 0, currentValueCents: 0, premiumsCents: 0, valuedCount: 0, investmentCount: 0, insuranceCount: 0 };
export function amountToCents(value: string): number | null {
  if (!value.trim()) return null;
  if (!/^\d+$|^\d+\.\d{1,2}$/.test(value)) return NaN;
  const [whole, fraction = ""] = value.split(".");
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(result) ? result : NaN;
}
