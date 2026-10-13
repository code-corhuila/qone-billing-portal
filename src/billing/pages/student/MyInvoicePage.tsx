import { useState } from "react";
import { billingApi } from "../../api/billingApi";
import { RequireRole } from "../../components/RequireRole";
import { RequestFailure } from "../../components/RequestFailure";
import { useRequest, failureOf } from "../../hooks/useRequest";
import { CURRENT_TERM, STATUS_TEXT, type Invoice } from "../../model/billing";
import { formatCents } from "../../model/money";

// HU-BIL-001: the term invoice of the signed-in student (BI-02) and its simulated payment
// (BI-05: exactly once, INV-BIL-002; the service returns the same invoice afterwards, D-04).
// Annex H: money rendered from integer cents, button disabled while pending, four states.
export function MyInvoicePage() {
  return (
    <RequireRole roles={["STUDENT"]}>
      <MyInvoice />
    </RequireRole>
  );
}

function MyInvoice() {
  const state = useRequest((signal) => billingApi.myInvoices({ term: CURRENT_TERM }, signal), []);
  const [paid, setPaid] = useState<Invoice | undefined>();
  const [pending, setPending] = useState(false);
  const [payError, setPayError] = useState<{ message: string; traceId?: string } | undefined>();

  if (state.status === "loading") return <p role="status">Loading your invoice...</p>;
  if (state.status === "error") return <RequestFailure error={state.error} retry={state.retry} />;
  const invoice = paid ?? state.data.data[0];
  if (!invoice) return <p>No invoice has been issued to you for {CURRENT_TERM}.</p>;

  async function pay(id: string) {
    setPending(true);
    setPayError(undefined);
    try {
      setPaid(await billingApi.pay(id));
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error(String(cause));
      const { traceId, serverMessage } = failureOf(error);
      const message = serverMessage || error.message;
      setPayError(traceId ? { message, traceId } : { message });
    } finally {
      setPending(false);
    }
  }

  return (
    <section aria-labelledby="invoice-title">
      <h3 id="invoice-title">Invoice {invoice.term}</h3>
      <dl>
        <dt>Student</dt>
        <dd>{invoice.studentName}</dd>
        <dt>Amount</dt>
        <dd>{formatCents(invoice.amountCents)}</dd>
        <dt>Status</dt>
        <dd>{STATUS_TEXT[invoice.status]}</dd>
        {invoice.status === "PAID" ? (
          <>
            <dt>Provider reference</dt>
            <dd>{invoice.providerReference}</dd>
            <dt>Paid on</dt>
            <dd>{invoice.paidAt?.slice(0, 10)}</dd>
          </>
        ) : null}
      </dl>
      {paid ? (
        <p role="status" aria-label="Payment result">
          Payment received. Reference {paid.providerReference}. Your enrollment gate is open.
        </p>
      ) : null}
      {payError ? (
        <div role="alert">
          <p>{payError.message}</p>
          {payError.traceId ? <p>Reference: {payError.traceId}</p> : null}
        </div>
      ) : null}
      {invoice.status === "ISSUED" ? (
        <button type="button" onClick={() => void pay(invoice.id)} disabled={pending}>
          {pending ? "Paying..." : `Pay ${formatCents(invoice.amountCents)} (simulated)`}
        </button>
      ) : null}
    </section>
  );
}
