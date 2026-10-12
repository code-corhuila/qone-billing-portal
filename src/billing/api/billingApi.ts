import { apiClient, type RequestOptions } from "shell/apiClient";
import type { Invoice, IssueInvoiceRequest, Page } from "../model/billing";

// Typed calls of qone-billing-api over the shell's client (Annex H: never fetch). Paths are
// relative; the shell knows the gateway.
const BASE = "/api/v1/billing";
type PageQuery = { page?: number; limit?: number };
const opts = (options: RequestOptions, signal?: AbortSignal): RequestOptions => (signal ? { ...options, signal } : options);

export const billingApi = {
  /** BI-02 */
  myInvoices: (query: PageQuery & { term?: string } = {}, signal?: AbortSignal) => apiClient.get<Page<Invoice>>(`${BASE}/invoices/me`, opts({ query }, signal)),
  /** BI-03 */
  getInvoice: (id: string, signal?: AbortSignal) => apiClient.get<Invoice>(`${BASE}/invoices/${encodeURIComponent(id)}`, opts({}, signal)),
  /** BI-05: pays exactly once; a PAID invoice comes back unchanged (D-04). No body. */
  pay: (id: string) => apiClient.post<Invoice>(`${BASE}/invoices/${encodeURIComponent(id)}/pay`),
  /** BI-04, ADMIN. One Idempotency-Key per intention, reused on retry (norm 5.4.2). */
  issue: (body: IssueInvoiceRequest, idempotencyKey: string) => apiClient.post<Invoice>(`${BASE}/invoices`, body, { idempotencyKey }),
  /** BI-06, ADMIN or SERVICE */
  currentOf: (studentId: string, signal?: AbortSignal) => apiClient.get<Invoice>(`${BASE}/students/${encodeURIComponent(studentId)}/invoices/current`, opts({}, signal)),
};
