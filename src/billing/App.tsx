import { Route, Routes } from "react-router";

// The module the shell mounts at /billing/* (exposed as ./App). Routes are relative to that
// mount. The screens of HU-BIL-001 (the term invoice and the simulated payment, the admin's
// invoice issue) are added on top of this file.
export function App() {
  return (
    <section aria-labelledby="billing-title">
      <h2 id="billing-title">Billing</h2>
      <Routes>
        <Route index element={<p>Your term invoice and the payment load here.</p>} />
      </Routes>
    </section>
  );
}

export default App;
