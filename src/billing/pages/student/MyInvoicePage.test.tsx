import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router";
import { server } from "../../../mocks/server";
import { billingFixtures } from "../../../mocks/fixtures/billing";
import { resetBilling } from "../../../mocks/handlers/billing";
import { testSession } from "../../../test/shell/session";
import { MyInvoicePage } from "./MyInvoicePage";

const renderPage = () =>
  render(
    <MemoryRouter>
      <MyInvoicePage />
    </MemoryRouter>,
  );
const asLaura = () => testSession.signInAs({ id: billingFixtures.students.laura.id, role: "STUDENT", name: "Laura Gómez" });
const asSantiago = () => testSession.signInAs({ id: billingFixtures.students.santiago.id, role: "STUDENT", name: "Santiago Rojas" });
beforeEach(() => resetBilling());

// HU-BIL-001: the term invoice and the simulated payment (BI-02, BI-05). Annex H: money shown
// from integer cents, button disabled while pending, four states.
describe("MyInvoicePage", () => {
  it("shows a paid invoice with its amount in COP, the provider reference and no pay button", async () => {
    asLaura();
    renderPage();
    expect(screen.getByRole("status")).toHaveTextContent("Loading your invoice");

    const card = await screen.findByRole("region", { name: "Invoice 2026-B" });
    expect(card).toHaveTextContent("$ 1.850.000,00");
    expect(card).toHaveTextContent("Paid");
    expect(card).toHaveTextContent("SIM-00000001");
    expect(card).toHaveTextContent("2026-08-10");
    expect(within(card).queryByRole("button", { name: /Pay/ })).not.toBeInTheDocument();
  });

  it("pays a pending invoice with the simulated provider and shows the confirmation", async () => {
    const user = userEvent.setup();
    asSantiago();
    renderPage();
    const card = await screen.findByRole("region", { name: "Invoice 2026-B" });
    expect(card).toHaveTextContent("Pending payment");

    await user.click(within(card).getByRole("button", { name: "Pay $ 1.850.000,00 (simulated)" }));

    expect(await screen.findByRole("status", { name: "Payment result" })).toHaveTextContent("Payment received. Reference SIM-");
    expect(screen.getByRole("region", { name: "Invoice 2026-B" })).toHaveTextContent("Paid");
    expect(within(screen.getByRole("region", { name: "Invoice 2026-B" })).queryByRole("button", { name: /Pay/ })).not.toBeInTheDocument();
  });

  it("disables the pay button while the payment is pending", async () => {
    const user = userEvent.setup();
    asSantiago();
    let release!: () => void;
    server.use(http.post("*/api/v1/billing/invoices/:id/pay", async () => { await new Promise<void>((r) => { release = r; }); return HttpResponse.json({ ...billingFixtures.invoices[1]!, status: "PAID", providerReference: "SIM-X", paidAt: "2026-10-12T00:00:00Z" }); }));
    renderPage();
    await user.click(await screen.findByRole("button", { name: /Pay/ }));

    expect(screen.getByRole("button", { name: "Paying..." })).toBeDisabled();
    release();
  });

  it("shows the empty state for a student without an invoice, and the error with retry", async () => {
    const user = userEvent.setup();
    testSession.signInAs({ id: "11111111-1111-4111-8111-111111111199", role: "STUDENT", name: "Sin Factura" });
    const { unmount } = renderPage();
    expect(await screen.findByText("No invoice has been issued to you for 2026-B.")).toBeInTheDocument();
    unmount();

    asLaura();
    server.use(http.get("*/api/v1/billing/invoices/me", () => HttpResponse.json({ error: "INTERNAL_ERROR", message: "x", traceId: "t-i1" }, { status: 500 }), { once: true }));
    renderPage();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("t-i1");
    await user.click(within(alert).getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("region", { name: "Invoice 2026-B" })).toBeInTheDocument();
  });

  it("shows the permission notice to a professor", () => {
    testSession.signInAs({ id: "22222222-2222-4222-8222-222222222221", role: "PROFESSOR", name: "Carlos Ramírez" });
    renderPage();
    expect(screen.getByRole("alert")).toHaveTextContent("You do not have permission for this section.");
  });
});
