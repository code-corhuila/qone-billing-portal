import type { RequestHandler } from "msw";

// The MSW handlers of the billing portal (BI-01..BI-06), added with the screens that use them;
// fixtures are the seed of qone-billing-db (06-data) validated against the contract.
export const handlers: RequestHandler[] = [];
