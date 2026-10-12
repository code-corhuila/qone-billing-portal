// Norm 5.4.3 and Annex H: money is converted from the text the person typed, never by
// multiplying a floating-point number. Amounts travel as integer COP cents (`amountCents`).

export type ParsedCents = { ok: true; cents: number } | { ok: false; reason: "not-a-number" | "too-many-decimals" | "negative" };

/**
 * Parses an amount as a person writes it in Colombia or elsewhere: "1.850.000,00",
 * "1,850,000.25", "$ 1.850.000", "0.07", "42". The last separator is the decimal one when it
 * is followed by one or two digits; three digits after every separator mean thousands groups.
 * Digits only, never a float: "0.07" is 7 cents exactly.
 */
export function parseCents(text: string): ParsedCents {
  const cleaned = text.replace(/[$\s]/g, "");
  if (cleaned.startsWith("-")) return { ok: false, reason: "negative" };
  if (!/^\d[\d.,]*$/.test(cleaned)) return { ok: false, reason: "not-a-number" };
  const lastSep = Math.max(cleaned.lastIndexOf("."), cleaned.lastIndexOf(","));
  let whole = cleaned;
  let fraction = "";
  if (lastSep >= 0) {
    const tail = cleaned.slice(lastSep + 1);
    if (tail.length === 3) {
      whole = cleaned; // a thousands group
    } else if (tail.length === 1 || tail.length === 2) {
      whole = cleaned.slice(0, lastSep);
      fraction = tail;
    } else {
      return { ok: false, reason: "too-many-decimals" };
    }
  }
  const digits = whole.replace(/[.,]/g, "");
  if (!/^\d+$/.test(digits)) return { ok: false, reason: "not-a-number" };
  const cents = Number(digits) * 100 + Number((fraction + "00").slice(0, 2));
  return { ok: true, cents };
}

/** "$ 1.850.000,00" from 185000000 cents: integer arithmetic only. */
export function formatCents(cents: number): string {
  const whole = Math.trunc(cents / 100);
  const fraction = String(Math.abs(cents % 100)).padStart(2, "0");
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `$ ${grouped},${fraction}`;
}
