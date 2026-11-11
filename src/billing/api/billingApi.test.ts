import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server";
import { billingFixtures, TUITION_CENTS } from "../../mocks/fixtures/billing";
import { resetBilling } from "../../mocks/handlers/billing";
import { testSession } from "../../test/shell/session";
import { billingApi } from "./billingApi";

// Core level: typed calls over shell/apiClient (stubbed in tests) against the simulated
// billing service. Paths, query parameters and the Idempotency-Key are the contract.
const asStudent01 = () => testSession.signInAs({ id: billingFixtures.students.student01.id, role: "STUDENT", name: "Estudiante Demo 01" });
const asStudent02 = () => testSession.signInAs({ id: billingFixtures.students.student02.id, role: "STUDENT", name: "Estudiante Demo 02" });
const asAdmin = () => testSession.signInAs({ id: "33333333-3333-4333-8333-333333333331", role: "ADMIN", name: "Administrador" });
beforeEach(() => resetBilling());

describe("billingApi", () => {
  it("lists my invoices as a page, newest first, with the term filter (BI-02)", async () => {
    asStudent01();
    const page = await billingApi.myInvoices({ term: "2026-B" });

    expect(page.meta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
    expect(page.data[0]).toMatchObject({ studentName: "Estudiante Demo 01", amountCents: TUITION_CENTS, status: "PAID" });
  });

  it("reads one invoice (BI-03) and hides another student's as 404 (D-03)", async () => {
    asStudent01();
    const student01 = billingFixtures.invoices[0]!;
    await expect(billingApi.getInvoice(student01.id)).resolves.toMatchObject({ id: student01.id });
    await expect(billingApi.getInvoice(billingFixtures.invoices[1]!.id)).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });
  });

  it("pays my ISSUED invoice exactly once and returns it unchanged on a second pay (BI-05, D-04)", async () => {
    asStudent02();
    const mine = (await billingApi.myInvoices()).data[0]!;
    expect(mine.status).toBe("ISSUED");

    const paid = await billingApi.pay(mine.id);
    expect(paid.status).toBe("PAID");
    expect(paid.providerReference).toMatch(/^SIM-/);
    expect(paid.paidAt).toBeTruthy();

    const again = await billingApi.pay(mine.id);
    expect(again).toEqual(paid);
  });

  it("refuses a student paying someone else's invoice (404) and a professor reading /me (403)", async () => {
    asStudent02();
    await expect(billingApi.pay(billingFixtures.invoices[0]!.id)).rejects.toMatchObject({ status: 404 });
    testSession.signInAs({ id: "22222222-2222-4222-8222-222222222221", role: "PROFESSOR", name: "Profesor Demo 01" });
    await expect(billingApi.myInvoices()).rejects.toMatchObject({ status: 403 });
  });

  it("issues an invoice as ADMIN with the Idempotency-Key, replays it on the same key and refuses a second one for the term (BI-04, INV-BIL-001)", async () => {
    asAdmin();
    const body = { studentId: "11111111-1111-4111-8111-111111111119", studentName: "Nuevo Estudiante", term: "2026-B", amountCents: 120000000 };

    const first = await billingApi.issue(body, "inv-new-0001");
    const replay = await billingApi.issue(body, "inv-new-0001");
    expect(first.status).toBe("ISSUED");
    expect(replay.id).toBe(first.id);
    await expect(billingApi.issue(body, "inv-new-0002")).rejects.toMatchObject({ status: 422, code: "BUSINESS_RULE_VIOLATION" });
  });

  it("reads the current invoice of a student as ADMIN (BI-06) and answers 404 when there is none", async () => {
    asAdmin();
    await expect(billingApi.currentOf(billingFixtures.students.student02.id)).resolves.toMatchObject({ status: "ISSUED" });
    await expect(billingApi.currentOf("11111111-1111-4111-8111-111111111199")).rejects.toMatchObject({ status: 404 });
  });

  it("surfaces a gateway failure as the envelope", async () => {
    asStudent01();
    server.use(http.get("*/api/v1/billing/invoices/me", () => HttpResponse.json({ error: "SERVICE_UNAVAILABLE", message: "down", traceId: "t-b1" }, { status: 503 })));
    await expect(billingApi.myInvoices()).rejects.toMatchObject({ status: 503, traceId: "t-b1" });
  });
});
