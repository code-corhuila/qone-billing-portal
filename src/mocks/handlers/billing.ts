import type { Msw } from "../msw";
import { callerOf } from "../caller";
import type { Invoice } from "../../billing/model/billing";
import { CURRENT_TERM } from "../../billing/model/billing";
import { billingFixtures, paginate, students } from "../fixtures/billing";

// MSW handlers of qone-billing-api (BI-01..BI-06) over the fixtures, with the rules of the
// contract: one invoice per student and term (INV-BIL-001), pay exactly once and return the
// same invoice afterwards (INV-BIL-002, D-04), another student's invoice hidden as 404 (D-03),
// idempotent issue for ADMIN. State lives in memory until the worker is reloaded.
const seed: Invoice[] = billingFixtures.invoices.map((i) => ({ ...i }));
let invoices: Invoice[] = seed.map((i) => ({ ...i }));
const byKey = new Map<string, string>();
let seq = 100;

const now = () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

export function billingHandlers({ http, HttpResponse }: Msw) {
  const envelope = (status: number, error: string, message: string, details?: Array<{ field: string; message: string }>) =>
    HttpResponse.json({ error, message, ...(details ? { details } : {}), traceId: crypto.randomUUID() }, { status });

  return [
    http.get("*/api/v1/billing/health", () => HttpResponse.json({ status: "ok", service: "qone-billing-api", version: "2.0.0" })),

    http.get("*/api/v1/billing/invoices/me", ({ request }) => {
      const who = callerOf(request);
      if (!who) return envelope(401, "UNAUTHORIZED", "missing or invalid token");
      if (who.role !== "STUDENT") return envelope(403, "FORBIDDEN", "this role may not perform the operation");
      const url = new URL(request.url);
      const term = url.searchParams.get("term");
      const rows = invoices.filter((i) => i.studentId === who.userId && (term ? i.term === term : true)).slice().reverse();
      return HttpResponse.json(paginate(rows, Number(url.searchParams.get("page") ?? "1"), Number(url.searchParams.get("limit") ?? "20")));
    }),

    http.post("*/api/v1/billing/invoices", async ({ request }) => {
      const who = callerOf(request);
      if (!who) return envelope(401, "UNAUTHORIZED", "missing or invalid token");
      if (who.role !== "ADMIN") return envelope(403, "FORBIDDEN", "this role may not perform the operation");
      const key = request.headers.get("idempotency-key") ?? "";
      if (key.length < 8 || key.length > 128) return envelope(400, "VALIDATION_ERROR", "the request has invalid fields", [{ field: "Idempotency-Key", message: "header required, 8 to 128 characters" }]);
      const existing = byKey.get(key);
      if (existing) return HttpResponse.json(invoices.find((i) => i.id === existing));
      const body = (await request.json().catch(() => null)) as { studentId?: string; studentName?: string; term?: string; amountCents?: number } | null;
      const details: Array<{ field: string; message: string }> = [];
      if (!body?.studentId) details.push({ field: "studentId", message: "required" });
      if (!body?.studentName || body.studentName.length < 2) details.push({ field: "studentName", message: "must have 2 to 120 characters" });
      if (!body?.term || !/^[0-9]{4}-[AB]$/.test(body.term)) details.push({ field: "term", message: "must match ^[0-9]{4}-[AB]$" });
      if (!Number.isInteger(body?.amountCents) || (body?.amountCents ?? 0) <= 0) details.push({ field: "amountCents", message: "must be a positive integer in cents" });
      if (details.length) return envelope(400, "VALIDATION_ERROR", "the request has invalid fields", details);
      if (invoices.some((i) => i.studentId === body!.studentId && i.term === body!.term)) return envelope(422, "BUSINESS_RULE_VIOLATION", `INV-BIL-001: ${body!.studentName} already has an invoice for ${body!.term}`);
      seq += 1;
      const created: Invoice = { id: crypto.randomUUID(), studentId: body!.studentId!, studentName: body!.studentName!, term: body!.term!, amountCents: body!.amountCents!, status: "ISSUED", providerReference: null, paidAt: null, createdAt: now() };
      invoices.push(created);
      byKey.set(key, created.id);
      return HttpResponse.json(created, { status: 201, headers: { Location: `/api/v1/billing/invoices/${created.id}` } });
    }),

    http.get("*/api/v1/billing/invoices/:id", ({ request, params }) => {
      const who = callerOf(request);
      if (!who) return envelope(401, "UNAUTHORIZED", "missing or invalid token");
      const i = invoices.find((x) => x.id === params["id"]);
      if (!i || (who.role === "STUDENT" && i.studentId !== who.userId)) return envelope(404, "NOT_FOUND", "resource not found");
      return HttpResponse.json(i);
    }),

    http.post("*/api/v1/billing/invoices/:id/pay", ({ request, params }) => {
      const who = callerOf(request);
      if (!who) return envelope(401, "UNAUTHORIZED", "missing or invalid token");
      if (who.role !== "STUDENT") return envelope(403, "FORBIDDEN", "this role may not perform the operation");
      const i = invoices.find((x) => x.id === params["id"]);
      if (!i || i.studentId !== who.userId) return envelope(404, "NOT_FOUND", "resource not found");
      if (i.status === "ISSUED") {
        seq += 1;
        i.status = "PAID";
        i.providerReference = `SIM-${String(seq).padStart(8, "0")}`;
        i.paidAt = now();
      }
      return HttpResponse.json(i);
    }),

    http.get("*/api/v1/billing/students/:studentId/invoices/current", ({ request, params }) => {
      const who = callerOf(request);
      if (!who) return envelope(401, "UNAUTHORIZED", "missing or invalid token");
      if (who.role !== "ADMIN" && who.role !== "SERVICE") return envelope(403, "FORBIDDEN", "this role may not perform the operation");
      const i = invoices.find((x) => x.studentId === params["studentId"] && x.term === CURRENT_TERM);
      return i ? HttpResponse.json(i) : envelope(404, "NOT_FOUND", "resource not found");
    }),
  ];
}

/** Test support: the seed again (every student as the fixtures describe them, Santiago unpaid). */
export function resetBilling(): void {
  invoices = seed.map((i) => ({ ...i }));
  byKey.clear();
}

export { students };
