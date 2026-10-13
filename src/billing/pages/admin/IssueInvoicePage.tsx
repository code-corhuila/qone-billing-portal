import { useState, type ChangeEvent, type FormEvent, type InputHTMLAttributes } from "react";
import { billingApi } from "../../api/billingApi";
import { RequireRole } from "../../components/RequireRole";
import { failureOf } from "../../hooks/useRequest";
import { CURRENT_TERM, type Invoice } from "../../model/billing";
import { useIdempotencyKey } from "../../model/idempotency";
import { formatCents, parseCents } from "../../model/money";

// HU-BIL-001 (admin side, BI-04): issue the term invoice of a student. The amount is typed as
// text and parsed into integer cents (norm 5.4.3, never through a float); one Idempotency-Key
// per intention (norm 5.4.2). Annex H: a label and an error per field, the button disabled
// while pending, the business rule of the service shown as the form error.
export function IssueInvoicePage() {
  return (
    <RequireRole roles={["ADMIN"]}>
      <IssueInvoiceForm />
    </RequireRole>
  );
}

type Field = "studentId" | "studentName" | "amount";
type Values = Record<Field, string>;
type Errors = Partial<Record<Field, string>>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMPTY: Values = { studentId: "", studentName: "", amount: "" };

function validate(values: Values): { errors: Errors; amountCents?: number } {
  const errors: Errors = {};
  if (!UUID.test(values.studentId.trim())) errors.studentId = "Write the student id (a UUID).";
  const name = values.studentName.trim();
  if (name.length < 2 || name.length > 120) errors.studentName = "Write the student name (2 to 120 characters).";
  const parsed = parseCents(values.amount);
  if (!parsed.ok) {
    errors.amount = parsed.reason === "negative" ? "Write a positive amount." : "Write the amount with at most two decimals, for example 1.850.000,00.";
  } else if (parsed.cents <= 0) {
    errors.amount = "Write a positive amount.";
  }
  return parsed.ok && !errors.amount ? { errors, amountCents: parsed.cents } : { errors };
}

function IssueInvoiceForm() {
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);
  const [issued, setIssued] = useState<Invoice | undefined>();
  const [failure, setFailure] = useState<{ message: string; traceId?: string } | undefined>();
  const { key, reset } = useIdempotencyKey("invoice");

  const set = (field: Field) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setValues((v) => ({ ...v, [field]: value }));
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    setIssued(undefined);
    setFailure(undefined);
    const result = validate(values);
    setErrors(result.errors);
    if (result.amountCents === undefined || Object.keys(result.errors).length > 0) return;
    setPending(true);
    try {
      const invoice = await billingApi.issue(
        { studentId: values.studentId.trim(), studentName: values.studentName.trim(), term: CURRENT_TERM, amountCents: result.amountCents },
        key,
      );
      setIssued(invoice);
      setValues(EMPTY);
      reset();
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error(String(cause));
      const { traceId, serverMessage } = failureOf(error);
      const message = serverMessage || error.message;
      setFailure(traceId ? { message, traceId } : { message });
    } finally {
      setPending(false);
    }
  }

  const field = (name: Field, label: string, props: InputHTMLAttributes<HTMLInputElement> = {}) => {
    const error = errors[name];
    const errorId = `${name}-error`;
    return (
      <p>
        <label htmlFor={name}>{label}</label>
        <br />
        <input
          id={name}
          name={name}
          value={values[name]}
          onChange={set(name)}
          disabled={pending}
          {...(error ? { "aria-invalid": true, "aria-describedby": errorId } : {})}
          {...props}
        />
        {error ? (
          <span id={errorId} style={{ display: "block" }}>
            {error}
          </span>
        ) : null}
      </p>
    );
  };

  return (
    <form onSubmit={(e) => void submit(e)} aria-labelledby="issue-title" noValidate>
      <h3 id="issue-title">Issue invoice</h3>
      <p>Term {CURRENT_TERM}</p>
      {field("studentId", "Student id", { placeholder: "11111111-1111-4111-8111-111111111111", autoComplete: "off" })}
      {field("studentName", "Student name", { autoComplete: "off" })}
      {field("amount", "Amount (COP)", { placeholder: "1.850.000,00", inputMode: "decimal", autoComplete: "off" })}
      {failure ? (
        <div role="alert">
          <p>{failure.message}</p>
          {failure.traceId ? <p>Reference: {failure.traceId}</p> : null}
        </div>
      ) : null}
      {issued ? (
        <p role="status">
          Invoice issued to {issued.studentName} for {formatCents(issued.amountCents)}.
        </p>
      ) : null}
      <button type="submit" disabled={pending}>
        {pending ? "Issuing..." : "Issue invoice"}
      </button>
    </form>
  );
}
