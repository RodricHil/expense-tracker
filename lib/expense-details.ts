export type ExpenseDetails = {
  onlineMethod?: string | null;
  upiApp?: string;
  upiSource?: string | null;
  cardNetwork?: string | null;
  merchant?: string;
  platform?: string;
  refunds?: { cents: number; date: string; source: string }[];
};
export const needsCard = (form: { mode: string } & ExpenseDetails) => form.mode === "card" || (form.mode === "online" && (form.onlineMethod === "card" || (form.onlineMethod === "upi" && form.upiSource === "rupay-credit")));
export function detailsPayload(form: ExpenseDetails & { mode: string }) {
  return {
    onlineMethod: form.mode === "online" ? form.onlineMethod || null : null,
    upiApp: form.mode === "online" && form.onlineMethod === "upi" ? form.upiApp || "" : "",
    upiSource: form.mode === "online" && form.onlineMethod === "upi" ? form.upiSource || null : null,
    cardNetwork: needsCard(form) ? (form.mode === "online" && form.onlineMethod === "upi" && form.upiSource === "rupay-credit" ? "rupay" : form.cardNetwork || null) : null,
    merchant: form.merchant || "", platform: form.platform || "",
  };
}
export function refundTotal(expense: ExpenseDetails) { return (expense.refunds ?? []).reduce((sum, refund) => sum + refund.cents, 0) / 100; }
