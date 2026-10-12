// Types copied from 07-api/contracts/openapi/qone-billing-api.yaml and _shared.yaml (Annex H:
// the portal's types mirror the contract field by field). The contract test validates the
// fixtures against the YAML; these types keep the compiler honest.

export const CURRENT_TERM = "2026-B";

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
export interface Page<T> {
  data: T[];
  meta: PageMeta;
}

export type InvoiceStatus = "ISSUED" | "PAID";

export interface Invoice {
  id: string;
  studentId: string;
  studentName: string;
  term: string;
  /** COP cents, integer; never a float (norm 5.3.5). */
  amountCents: number;
  status: InvoiceStatus;
  providerReference?: string | null;
  paidAt?: string | null;
  createdAt: string;
}

export interface IssueInvoiceRequest {
  studentId: string;
  studentName: string;
  term: string;
  amountCents: number;
}

export const STATUS_TEXT: Record<InvoiceStatus, string> = { ISSUED: "Pending payment", PAID: "Paid" };
