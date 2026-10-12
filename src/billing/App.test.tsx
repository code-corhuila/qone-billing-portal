import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { billingFixtures } from "../mocks/fixtures/billing";
import { testSession } from "../test/shell/session";
import { App } from "./App";

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/billing/*" element={<App />} />
      </Routes>
    </MemoryRouter>,
  );

// Mounted anywhere by the shell, the portal renders its own heading and routes each role to
// its screen of HU-BIL-001.
describe("billing App", () => {
  it("sends a student from the index to the invoice screen", async () => {
    testSession.signInAs({ id: billingFixtures.students.laura.id, role: "STUDENT", name: "Laura Gómez" });
    renderAt("/billing");

    expect(screen.getByRole("heading", { level: 2, name: "Billing" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "My invoice" })).toHaveAttribute("href", "/billing/invoice");
    expect(await screen.findByRole("region", { name: "Invoice 2026-B" })).toBeInTheDocument();
  });

  it("sends an admin from the index to the issue form", () => {
    testSession.signInAs({ id: "33333333-3333-4333-8333-333333333331", role: "ADMIN", name: "Patricia Mora" });
    renderAt("/billing");

    expect(screen.getByRole("link", { name: "Issue invoice" })).toHaveAttribute("href", "/billing/admin/invoices/new");
    expect(screen.getByRole("form", { name: "Issue invoice" })).toBeInTheDocument();
  });

  it("answers an unknown route inside the mount with its own not found", () => {
    testSession.signInAs({ id: billingFixtures.students.laura.id, role: "STUDENT", name: "Laura Gómez" });
    renderAt("/billing/anything");
    expect(screen.getByText("Not found")).toBeInTheDocument();
  });
});
