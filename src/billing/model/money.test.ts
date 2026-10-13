import { formatCents, parseCents } from "./money";

// Norm 5.4.3 and Annex H: money is converted from the text the person typed, never by
// multiplying a floating-point number (0.07 * 100 is 7.000000000000001). The API field is
// `amountCents`, an integer in COP cents.
describe("parseCents", () => {
  it.each([
    ["0.07", 7],
    ["1850000", 185000000],
    ["1850000.5", 185000050],
    ["1.850.000,00", 185000000],
    ["$ 1.850.000", 185000000],
    ["1,850,000.25", 185000025],
    ["  42  ", 4200],
    ["0", 0],
  ])("turns %s into %i cents without floating point", (text, cents) => {
    expect(parseCents(text)).toEqual({ ok: true, cents });
  });

  it("rejects text that is not an amount, more than two decimals, or a negative amount", () => {
    expect(parseCents("abc")).toEqual({ ok: false, reason: "not-a-number" });
    expect(parseCents("")).toEqual({ ok: false, reason: "not-a-number" });
    expect(parseCents("1.234")).toEqual({ ok: true, cents: 123400 });
    expect(parseCents("1.2345")).toEqual({ ok: false, reason: "too-many-decimals" });
    expect(parseCents("-5")).toEqual({ ok: false, reason: "negative" });
  });
});

describe("formatCents", () => {
  it("renders cents as COP with thousands separators and two decimals", () => {
    expect(formatCents(185000000)).toBe("$ 1.850.000,00");
    expect(formatCents(7)).toBe("$ 0,07");
    expect(formatCents(0)).toBe("$ 0,00");
  });
});
