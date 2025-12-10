import createClient from "openapi-fetch";
import type { paths } from "@/types/openapi";

export const client = createClient<paths>({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
  credentials: "include",
});
