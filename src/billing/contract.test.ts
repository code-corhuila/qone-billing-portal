// @vitest-environment node
// Contract level (ADR-009): the synthetic data and the handler responses must match the YAML
// copy of qone-billing-api, so "aligned with 07" is a test result.
import { billingFixtures } from "../mocks/fixtures/billing";
import { expectValid, loadContract, type Contract } from "../test/contracts";

let billing: Contract;
beforeAll(async () => {
  billing = await loadContract("qone-billing-api.yaml");
});

describe("billing fixtures against qone-billing-api.yaml", () => {
  it("every invoice matches Invoice and the page matches BI-02's 200", () => {
    for (const i of billingFixtures.invoices) expectValid(billing.schema("Invoice"), i, `invoice of ${i.studentName}`);
    expectValid(billing.response("get", "/billing/invoices/me", 200), billingFixtures.paginate(billingFixtures.invoices, 1, 20), "invoices page");
  });

  it("an ISSUED invoice has no provider reference and no paidAt; a PAID one has both", () => {
    const issued = billingFixtures.invoices.find((i) => i.status === "ISSUED")!;
    const paid = billingFixtures.invoices.find((i) => i.status === "PAID")!;
    expect(issued.providerReference).toBeNull();
    expect(issued.paidAt).toBeNull();
    expect(paid.providerReference).toMatch(/^SIM-/);
    expectValid(billing.response("post", "/billing/invoices/{id}/pay", 200), paid, "paid invoice");
  });

  it("rejects a fixture that drifts from the contract (money as a decimal)", () => {
    const drifted = { ...billingFixtures.invoices[0]!, amountCents: 1850000.5 };
    expect(billing.schema("Invoice")(drifted)).toBe(false);
  });
});
