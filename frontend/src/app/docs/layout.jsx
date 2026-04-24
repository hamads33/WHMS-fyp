export const metadata = {
  title: "API Documentation — WHMS",
  description: "Complete REST API reference for the WHMS SaaS backend.",
};

export default function DocsLayout({ children }) {
  return (
    // Opt out of the root layout's padding/container — docs has its own full-bleed layout
    <div className="min-h-screen bg-background antialiased">
      {children}
    </div>
  );
}
