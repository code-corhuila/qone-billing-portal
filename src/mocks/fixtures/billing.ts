import { CURRENT_TERM, type Invoice, type Page } from "../../billing/model/billing";

// Synthetic data of the billing domain (ADR-009): the term invoices of the five students of
// the prototype seed, the same people and ids as the identity and enrollment fixtures.
// Santiago's invoice is ISSUED (the tuition gate demo); the rest are PAID. Amounts are COP cents.

const issuedAt = "2026-08-01T12:00:00Z";
const paidAt = "2026-08-10T15:30:00Z";
export const TUITION_CENTS = 185000000; // COP 1,850,000.00

function invoice(n: number, studentId: string, studentName: string, status: Invoice["status"]): Invoice {
  return {
    id: `88888888-8888-4888-8888-8888888888${String(n).padStart(2, "0")}`,
    studentId,
    studentName,
    term: CURRENT_TERM,
    amountCents: TUITION_CENTS,
    status,
    providerReference: status === "PAID" ? `SIM-${String(n).padStart(8, "0")}` : null,
    paidAt: status === "PAID" ? paidAt : null,
    createdAt: issuedAt,
  };
}

export const students = {
  laura: { id: "11111111-1111-4111-8111-111111111111", name: "Laura Gómez" },
  santiago: { id: "11111111-1111-4111-8111-111111111112", name: "Santiago Rojas" },
  maria: { id: "11111111-1111-4111-8111-111111111113", name: "María José Cabrera" },
  andres: { id: "11111111-1111-4111-8111-111111111114", name: "Andrés Pineda" },
  valentina: { id: "11111111-1111-4111-8111-111111111115", name: "Valentina Suárez" },
} as const;

export const invoices: Invoice[] = [
  invoice(1, students.laura.id, students.laura.name, "PAID"),
  invoice(2, students.santiago.id, students.santiago.name, "ISSUED"),
  invoice(3, students.maria.id, students.maria.name, "PAID"),
  invoice(4, students.andres.id, students.andres.name, "PAID"),
  invoice(5, students.valentina.id, students.valentina.name, "PAID"),
];

export function paginate<T>(rows: readonly T[], page: number, limit: number): Page<T> {
  const start = (page - 1) * limit;
  return { data: rows.slice(start, start + limit), meta: { page, limit, total: rows.length, totalPages: Math.ceil(rows.length / limit) } };
}

export const billingFixtures = { invoices, students, paginate };
