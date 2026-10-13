import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router";
import { server } from "../../../mocks/server";
import { billingFixtures } from "../../../mocks/fixtures/billing";
import { resetBilling } from "../../../mocks/handlers/billing";
import { testSession } from "../../../test/shell/session";
import { IssueInvoicePage } from "./IssueInvoicePage";

const renderPage = () =>
  render(
    <MemoryRouter>
      <IssueInvoicePage />
    </MemoryRouter>,
  );
const asAdmin = () => testSession.signInAs({ id: "33333333-3333-4333-8333-333333333331", role: "ADMIN", name: "Patricia Mora" });
beforeEach(() => resetBilling());

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Student id"), "11111111-1111-4111-8111-111111111119");
  await user.type(screen.getByLabelText("Student name"), "Nuevo Estudiante");
  await user.clear(screen.getByLabelText("Amount (COP)"));
  await user.type(screen.getByLabelText("Amount (COP)"), "1.850.000,50");
}

// HU-BIL-001 (admin side, BI-04): issue the term invoice. Norm 5.4.3: the amount is parsed
// from the typed text into cents, never through a float. Annex H form rules.
describe("IssueInvoicePage", () => {
  it("has a labelled field per attribute and the current term fixed", () => {
    asAdmin();
    renderPage();
    for (const label of ["Student id", "Student name", "Amount (COP)"]) expect(screen.getByLabelText(label)).toBeInTheDocument();
    expect(screen.getByText("Term 2026-B")).toBeInTheDocument();
  });

  it("validates on the client with the error beside the field and sends nothing", async () => {
    const user = userEvent.setup();
    asAdmin();
    let called = false;
    server.use(http.post("*/api/v1/billing/invoices", () => { called = true; return HttpResponse.json({}, { status: 201 }); }));
    renderPage();

    await user.type(screen.getByLabelText("Amount (COP)"), "1.2345");
    await user.click(screen.getByRole("button", { name: "Issue invoice" }));

    const amount = screen.getByLabelText("Amount (COP)");
    const error = screen.getByText("Write the amount with at most two decimals, for example 1.850.000,00.");
    expect(amount).toHaveAttribute("aria-describedby", error.id);
    expect(amount).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Write the student id (a UUID).")).toBeInTheDocument();
    expect(called).toBe(false);
  });

  it("sends the amount as integer cents parsed from the text, with the Idempotency-Key, and shows the issued invoice", async () => {
    const user = userEvent.setup();
    asAdmin();
    let body: unknown;
    let key: string | null = null;
    server.use(http.post("*/api/v1/billing/invoices", async ({ request }) => { body = await request.json(); key = request.headers.get("idempotency-key"); return HttpResponse.json({ id: "n", ...(body as object), status: "ISSUED", providerReference: null, paidAt: null, createdAt: "2026-10-12T00:00:00Z" }, { status: 201 }); }));
    renderPage();
    await fillValid(user);

    await user.click(screen.getByRole("button", { name: "Issue invoice" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Invoice issued to Nuevo Estudiante for $ 1.850.000,50.");
    expect(body).toEqual({ studentId: "11111111-1111-4111-8111-111111111119", studentName: "Nuevo Estudiante", term: "2026-B", amountCents: 185000050 });
    expect(key).toMatch(/^invoice-/);
  });

  it("shows the business rule of the service as the form error (one invoice per student and term)", async () => {
    const user = userEvent.setup();
    asAdmin();
    renderPage();
    await user.type(screen.getByLabelText("Student id"), billingFixtures.students.laura.id);
    await user.type(screen.getByLabelText("Student name"), "Laura Gómez");
    await user.clear(screen.getByLabelText("Amount (COP)"));
    await user.type(screen.getByLabelText("Amount (COP)"), "1850000");

    await user.click(screen.getByRole("button", { name: "Issue invoice" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("INV-BIL-001");
  });

  it("shows the permission notice to a student", () => {
    testSession.signInAs({ id: billingFixtures.students.laura.id, role: "STUDENT", name: "Laura Gómez" });
    renderPage();
    expect(screen.getByRole("alert")).toHaveTextContent("You do not have permission for this section.");
  });
});
