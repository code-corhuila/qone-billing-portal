import { http, HttpResponse } from "msw";
import type { Msw } from "../msw";
import { billingHandlers } from "./billing";

// Every handler of the billing portal, built with the given msw primitives (ADR-009):
// BI-01..BI-06 over the fixtures of the seed.
export function createHandlers(msw: Msw) {
  return [...billingHandlers(msw)];
}

/** The handlers for this portal's own tests (Node server in src/mocks/server.ts). */
export const handlers = createHandlers({ http, HttpResponse });
