type Category = { _id: string; kind: string; name: string; archived?: boolean };
const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
function receiptDate(value: string): string | undefined {
  const iso = value.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  const numeric = value.match(/\b(\d{1,2})[/.\-](\d{1,2})[/.\-](20\d{2})\b/);
  const named = value.match(/\b([A-Za-z]+)\s+(\d{1,2}),?\s+(20\d{2})\b/);
  const reversed = value.match(/\b(\d{1,2})\s+([A-Za-z]+),?\s+(20\d{2})\b/);
  let parts: string[] | undefined;
  if (iso) parts = [iso[1], iso[2], iso[3]];
  else if (numeric) parts = [numeric[3], numeric[2], numeric[1]];
  else if (named || reversed) {
    const match = (named ?? reversed)!;
    const month = months.indexOf((named ? match[1] : match[2]).toLowerCase().slice(0, 3));
    if (month >= 0) parts = [match[3], String(month + 1), named ? match[2] : match[1]];
  }
  if (!parts) return;
  const date = parts.map((p) => p.padStart(2, "0")).join("-");
  const parsed = new Date(date);
  if (!Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date) return date;
}
/** Local suggestions only; categories are matched exclusively against the user's list. */
export function parseReceipt(text: string, categories: Category[] = []): { description?: string; merchant?: string; amount?: string; date?: string; platform?: string; type?: string; mode?: string; onlineMethod?: string } {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const noise = /^(?:page\s+\d|invoice\b|receipt\b|tax invoice\b|date\b|due\b|bill(?:ed|ing)?\s+to\b|ship(?:ped|ping)?\s+to\b|description\b|qty\b|quantity\b|amount\b|total\b|subtotal\b|tax\b|paid\b|payment\b|https?:|www\.)/i;
  const merchantHeading = /^(?:merchant|seller|supplier|sold by|issued by)(?:\s*[:\-]\s*|$)/i;
  const merchantLabel = lines.findIndex((line) => merchantHeading.test(line));
  const isBusinessName = (line: string) => /[a-zA-Z]/.test(line)
    && !noise.test(line)
    && !/^(?:\d+\s*[x×]|discount|discounted price|platform fee|shipping|delivery|you['’]?re saving|savings|upi|cash|credit card|debit card|visa|mastercard|rupay)\b/i.test(line)
    && !/[@₹$€£]/.test(line) && !/[0-9][0-9,]*\.[0-9]{2}\b/.test(line)
    && !receiptDate(line);
  // Only use an unlabelled business header before the receipt's item/payment body.
  const bodyStart = lines.findIndex((line) => /^\d+\s*[x×]|^description\b|^items?\b|^payment\b|^subtotal\b|^total\b/i.test(line));
  const headerLines = bodyStart < 0 ? lines : lines.slice(0, bodyStart);
  const labelledName = merchantLabel >= 0 ? lines[merchantLabel].replace(merchantHeading, "") || lines[merchantLabel + 1] : undefined;
  const merchant = (labelledName ? isBusinessName(labelledName) ? labelledName : undefined : headerLines.find(isBusinessName))?.slice(0, 120);
  const header = lines.findIndex((line) => /^description\b|^item\s*(?:description|qty|quantity|price)/i.test(line));
  const itemRows = lines.filter((line) => /^\d+\s*[x×]\s*\S/i.test(line));
  const tableRows: string[] = [];
  if (header >= 0) {
    for (const line of lines.slice(header + 1)) {
      if (/^(?:subtotal|sub total|total|grand total|discount|tax|platform fee|payment|amount due|amount paid|net payable)\b/i.test(line)) break;
      if (/[a-zA-Z]/.test(line) && !noise.test(line) && !receiptDate(line)) tableRows.push(line);
    }
  }
  const items = (itemRows.length ? itemRows : tableRows).map((line) => line.replace(/\s*[₹$€£]\s*[0-9][0-9,.]*\s*$/, "").replace(/\s+[0-9][0-9,. ]*$/, "").trim());
  const description = (items.length ? items.join("\n") : merchant)?.slice(0, 500);
  let amount: string | undefined;
  for (let i = 0; i < lines.length; i++) {
    if (!/grand total|amount paid|total paid|net payable|total amount|amount payable|amount due|^total\b/i.test(lines[i]) || /subtotal|sub total|tax total/i.test(lines[i])) continue;
    const matches = (lines[i] + " " + (/[0-9]/.test(lines[i]) ? "" : lines[i + 1] ?? "")).match(/[0-9][0-9,]*\.[0-9]{2}\b/g);
    const candidate = matches?.at(-1)?.replaceAll(",", "");
    if (candidate && Number(candidate) > 0) amount = candidate;
  }
  const issueLines = lines.flatMap((line, i) => /(?:date of issue|issue date|issued on|invoice date|receipt date|date issued|date generated|generated on|^date\s*:)/i.test(line) ? [line + " " + (lines[i + 1] ?? "")] : []);
  const date = issueLines.map(receiptDate).find(Boolean) ?? lines.filter((line) => !/due|billing period|service period|delivery|expiry/i.test(line)).map(receiptDate).find(Boolean);
  const platform = text.match(/\b(?:Amazon|Swiggy|Zomato|Flipkart|OpenAI|ChatGPT|Netflix|Spotify|Uber|Ola|YouTube|Google Play|Apple App Store|Blinkit|Zepto|CRED)\b/i)?.[0];
  const categoryText = (description ?? "") + " " + (platform ?? "");
  const matches = categories.filter((c) => c.kind === "category" && !c.archived && (categoryText.toLowerCase().includes(c.name.toLowerCase()) || (c.name.toLowerCase() === "subscriptions" && /subscription|chatgpt|openai|netflix|spotify|youtube premium/i.test(categoryText))));
  // Read the actual payment section, rather than accepted-payment logos.
  const paymentHeader = lines.findIndex((line) => /^payment (?:method|mode)\b|^paid (?:by|via|using)\b|^mode of payment\b/i.test(line));
  const paymentText = paymentHeader >= 0 ? lines.slice(paymentHeader, paymentHeader + 3).join(" ") : lines.filter((line) => /^(?:UPI|credit card|debit card|cash|cash on delivery|paid online)$/i.test(line)).join(" ");
  const upi = /\bupi\b/i.test(paymentText);
  const card = /\b(?:card|visa|mastercard|rupay|amex)\b/i.test(paymentText);
  const cash = /\bcash\b|\bcod\b/i.test(paymentText);
  const payment = Number(upi) + Number(card) + Number(cash) === 1
    ? upi ? { mode: "online", onlineMethod: "upi" }
      : cash ? { mode: "cash", onlineMethod: "" }
      : /paid online|online/i.test(paymentText + " " + lines.filter((line) => /^paid online$/i.test(line)).join(" ")) ? { mode: "online", onlineMethod: "card" } : { mode: "card", onlineMethod: "" }
    : /\bpaid online\b/i.test(paymentText) ? { mode: "online" } : {};
  return { description, merchant, amount, date, ...payment, ...(platform ? { platform } : {}), ...(matches.length === 1 ? { type: `custom:${matches[0]._id}` } : {}) };
}
