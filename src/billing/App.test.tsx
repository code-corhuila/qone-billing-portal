import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { App } from "./App";

// First test of the portal (written before App.tsx): mounted anywhere by the shell, it renders
// its own heading and its index route.
describe("billing App", () => {
  it("renders the billing heading and its index content", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Billing" })).toBeInTheDocument();
    expect(screen.getByText("Your term invoice and the payment load here.")).toBeInTheDocument();
  });
});
