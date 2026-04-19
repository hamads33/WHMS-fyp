import { Separator } from "@/components/ui/separator";
import { EndpointCard } from "./EndpointCard";
import { MethodBadge } from "./MethodBadge";

const METHOD_ORDER = { get: 0, post: 1, put: 2, patch: 3, delete: 4 };

export function EndpointGroup({ group, schemas }) {
  const { tag, description, endpoints } = group;

  const sorted = [...endpoints].sort(
    (a, b) => (METHOD_ORDER[a.method] ?? 5) - (METHOD_ORDER[b.method] ?? 5)
  );

  const uniqueMethods = [...new Set(sorted.map((e) => e.method))];

  return (
    <section>
      {/* Group header */}
      <div className="mb-5">
        <div className="flex items-center gap-3 mb-1">
          <h2 className="text-xl font-bold text-foreground">{tag}</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground font-mono tabular-nums">
            {endpoints.length}
          </span>
        </div>

        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed mb-2">{description}</p>
        )}

        <div className="flex flex-wrap gap-1 mt-2">
          {uniqueMethods.map((m) => (
            <MethodBadge key={m} method={m} />
          ))}
        </div>
      </div>

      {/* Endpoint cards */}
      <div className="space-y-2">
        {sorted.map((endpoint) => (
          <EndpointCard key={endpoint.id} endpoint={endpoint} schemas={schemas} />
        ))}
      </div>
    </section>
  );
}
