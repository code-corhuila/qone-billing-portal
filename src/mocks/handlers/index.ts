import { http, HttpResponse } from "msw";
import type { Msw } from "../msw";

// Every handler of the billing portal, built with the given msw primitives (ADR-009):
// BI-01..BI-06, added with the screens that use them.
export function createHandlers(_msw: Msw) {
  return [];
}

/** The handlers for this portal's own tests (Node server in src/mocks/server.ts). */
export const handlers = createHandlers({ http, HttpResponse });
