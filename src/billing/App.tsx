import { NavLink, Navigate, Route, Routes } from "react-router";
import { useSessionUser } from "./components/RequireRole";
import { useMountBase } from "./hooks/useMountBase";
import { IssueInvoicePage } from "./pages/admin/IssueInvoicePage";
import { MyInvoicePage } from "./pages/student/MyInvoicePage";

// The module the shell mounts at /billing/* (exposed as ./App). Routes are relative to that
// mount; links are absolute from the mount base (React Router 7 resolves relative links of a
// splat route against the whole matched path). HU-BIL-001: the student's term invoice with
// the simulated payment, and the admin's invoice issue.
export function App() {
  const base = useMountBase();
  const user = useSessionUser();
  return (
    <section aria-labelledby="billing-title">
      <h2 id="billing-title">Billing</h2>
      <nav aria-label="Billing">
        {user?.role === "STUDENT" ? <NavLink to={`${base}/invoice`}>My invoice</NavLink> : null}
        {user?.role === "ADMIN" ? <NavLink to={`${base}/admin/invoices/new`}>Issue invoice</NavLink> : null}
      </nav>
      <Routes>
        <Route index element={<Navigate to={user?.role === "ADMIN" ? "admin/invoices/new" : "invoice"} replace />} />
        <Route path="invoice" element={<MyInvoicePage />} />
        <Route path="admin/invoices/new" element={<IssueInvoicePage />} />
        <Route path="*" element={<p>Not found</p>} />
      </Routes>
    </section>
  );
}

export default App;
