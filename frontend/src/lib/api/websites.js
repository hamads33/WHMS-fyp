import { apiFetch } from "./client";

export const WebsitesAPI = {
  list: () => apiFetch("/websites"),
  create: ({ domain, email }) =>
    apiFetch("/websites/create", {
      method: "POST",
      body: JSON.stringify({ domain, email }),
    }),
};
