import { ApiDocs } from "@/components/docs/ApiDocs";

export const dynamic = "force-dynamic";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, "") ||
  "http://localhost:4000";

async function getSpec() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/openapi.json`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function DocsPage() {
  const spec = await getSpec();
  return <ApiDocs spec={spec} />;
}
