"use client";

import { useState } from "react";
import { ChevronDown, Lock } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MethodBadge } from "./MethodBadge";
import { JsonViewer } from "./JsonViewer";
import { CopyButton } from "./CopyButton";
import { cn } from "@/lib/utils";

/* ── helpers ────────────────────────────────────────────── */

function resolveSchema(schema, schemas) {
  if (!schema) return null;
  if (schema.$ref) {
    const name = schema.$ref.replace("#/components/schemas/", "");
    return schemas?.[name] || schema;
  }
  return schema;
}

function buildExample(schema, schemas, depth = 0) {
  if (!schema || depth > 3) return null;
  schema = resolveSchema(schema, schemas);
  if (!schema) return null;
  if (schema.example !== undefined) return schema.example;
  if (schema.type === "object" && schema.properties) {
    const obj = {};
    Object.entries(schema.properties).forEach(([k, v]) => {
      const resolved = resolveSchema(v, schemas);
      obj[k] = resolved?.example ?? resolved?.type ?? "…";
    });
    return obj;
  }
  if (schema.allOf) {
    const merged = {};
    schema.allOf.forEach((s) => {
      const ex = buildExample(s, schemas, depth + 1);
      if (typeof ex === "object" && ex !== null) Object.assign(merged, ex);
    });
    return Object.keys(merged).length ? merged : null;
  }
  if (schema.type === "array" && schema.items) {
    return [buildExample(schema.items, schemas, depth + 1)];
  }
  return schema.type ?? null;
}

/* ── sub-components ─────────────────────────────────────── */

function ParamTable({ params }) {
  if (!params?.length) {
    return <p className="text-sm text-muted-foreground">No parameters.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="pb-2 pr-4 font-medium text-muted-foreground">Name</th>
            <th className="pb-2 pr-4 font-medium text-muted-foreground">In</th>
            <th className="pb-2 pr-4 font-medium text-muted-foreground">Type</th>
            <th className="pb-2 pr-4 font-medium text-muted-foreground">Required</th>
            <th className="pb-2 font-medium text-muted-foreground">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {params.map((p) => (
            <tr key={`${p.in}-${p.name}`}>
              <td className="py-2 pr-4 font-mono text-foreground">{p.name}</td>
              <td className="py-2 pr-4">
                <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                  {p.in}
                </span>
              </td>
              <td className="py-2 pr-4 font-mono text-muted-foreground">
                {p.schema?.type || "—"}
              </td>
              <td className="py-2 pr-4">
                {p.required ? (
                  <span className="text-red-500">required</span>
                ) : (
                  <span className="text-muted-foreground">optional</span>
                )}
              </td>
              <td className="py-2 text-muted-foreground">{p.description || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResponseList({ responses, schemas }) {
  if (!responses) return <p className="text-sm text-muted-foreground">No response schemas.</p>;

  return (
    <div className="space-y-4">
      {Object.entries(responses).map(([code, resp]) => {
        const schema = resp?.content?.["application/json"]?.schema;
        return (
          <div key={code}>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={cn(
                  "rounded px-2 py-0.5 text-xs font-mono font-bold",
                  code.startsWith("2")
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                    : code.startsWith("4")
                    ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {code}
              </span>
              <span className="text-xs text-muted-foreground">{resp.description}</span>
            </div>
            {schema && (
              <JsonViewer data={resolveSchema(schema, schemas)} maxHeight="240px" />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── cURL builder ───────────────────────────────────────── */

function buildCurl(method, path, parameters, requestBody, requiresAuth) {
  const baseUrl = "http://localhost:4000";
  const url = `${baseUrl}${path}`;
  const lines = [`curl -X ${method.toUpperCase()} '${url}'`];

  if (requiresAuth) {
    lines.push("  -H 'Authorization: Bearer <token>'");
  }

  const contentType = Object.keys(requestBody?.content || {})[0];

  if (contentType === "application/json") {
    lines.push("  -H 'Content-Type: application/json'");
    const schema = requestBody.content["application/json"].schema;
    const example = buildExample(schema, {});
    if (example) {
      lines.push(`  -d '${JSON.stringify(example, null, 2)}'`);
    }
  } else if (contentType === "multipart/form-data") {
    const schema = requestBody.content["multipart/form-data"].schema;
    if (schema?.properties) {
      Object.entries(schema.properties).forEach(([key, val]) => {
        if (val.format === "binary") {
          lines.push(`  -F '${key}=@/path/to/file'`);
        } else {
          lines.push(`  -F '${key}=<value>'`);
        }
      });
    }
  }

  return lines.join(" \\\n");
}

/* ── main component ─────────────────────────────────────── */

export function EndpointCard({ endpoint, schemas }) {
  const [open, setOpen] = useState(false);

  const {
    method,
    path,
    summary,
    description,
    parameters,
    requestBody,
    responses,
    security,
  } = endpoint;

  const requiresAuth = Array.isArray(security) && security.length > 0;
  const hasParams    = parameters?.length > 0;
  const hasBody      = !!requestBody;
  const hasResponses = !!responses && Object.keys(responses).length > 0;

  // Detect content type (json or multipart)
  const contentType = hasBody
    ? Object.keys(requestBody.content || {})[0] || "application/json"
    : null;
  const isMultipart = contentType === "multipart/form-data";

  const requestSchema  = hasBody
    ? requestBody.content?.[contentType]?.schema
    : null;
  const requestExample = buildExample(requestSchema, schemas);

  const successResponse =
    responses?.["200"] || responses?.["201"] || responses?.["204"];
  const responseSchema  = successResponse?.content?.["application/json"]?.schema;
  const responseExample = buildExample(responseSchema, schemas);

  const curlSnippet = buildCurl(method, path, parameters, requestBody, requiresAuth);

  const tabCount = 1 + (hasParams ? 1 : 0) + (hasBody ? 1 : 0) + (hasResponses ? 1 : 0) + 1;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-all duration-150",
            "bg-card hover:bg-muted/50",
            open
              ? "border-border rounded-b-none shadow-sm"
              : "border-border hover:shadow-sm"
          )}
        >
          <MethodBadge method={method} />

          <code className="flex-1 min-w-0 text-sm font-mono text-foreground truncate">
            {path}
          </code>

          {summary && (
            <span className="hidden md:block text-sm text-muted-foreground truncate max-w-xs">
              {summary}
            </span>
          )}

          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
            {requiresAuth && (
              <Lock className="h-3 w-3 text-muted-foreground" title="Requires authentication" />
            )}
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                open && "rotate-180"
              )}
            />
          </div>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="border border-t-0 border-border rounded-b-lg bg-card px-4 pb-4 pt-3">
          {(description || summary) && (
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              {description || summary}
            </p>
          )}

          <Tabs defaultValue="overview">
            <TabsList className="h-8 mb-4">
              <TabsTrigger value="overview" className="text-xs px-3">
                Overview
              </TabsTrigger>
              {hasParams && (
                <TabsTrigger value="params" className="text-xs px-3">
                  Parameters {parameters.length > 0 && `(${parameters.length})`}
                </TabsTrigger>
              )}
              {hasBody && (
                <TabsTrigger value="body" className="text-xs px-3">
                  Request Body
                </TabsTrigger>
              )}
              {hasResponses && (
                <TabsTrigger value="response" className="text-xs px-3">
                  Responses
                </TabsTrigger>
              )}
              <TabsTrigger value="curl" className="text-xs px-3">
                cURL
              </TabsTrigger>
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview" className="mt-0 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-lg bg-muted/50 border border-border p-3">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                    Method
                  </p>
                  <MethodBadge method={method} />
                </div>
                <div className="rounded-lg bg-muted/50 border border-border p-3">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                    Auth
                  </p>
                  <p className="text-xs text-foreground">
                    {requiresAuth ? "Bearer token" : "Public"}
                  </p>
                </div>
                {hasBody && (
                  <div className="rounded-lg bg-muted/50 border border-border p-3">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                      Content Type
                    </p>
                    <p className="text-xs font-mono text-foreground">{contentType}</p>
                  </div>
                )}
              </div>

              <div className="rounded-lg bg-muted/50 border border-border p-3">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                  Endpoint
                </p>
                <code className="text-xs font-mono text-foreground break-all">{path}</code>
              </div>

              {requestExample && (
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                    Example Request
                  </p>
                  <JsonViewer data={requestExample} />
                </div>
              )}

              {responseExample && (
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                    Example Response
                  </p>
                  <JsonViewer data={responseExample} />
                </div>
              )}
            </TabsContent>

            {/* Parameters */}
            {hasParams && (
              <TabsContent value="params" className="mt-0">
                <ParamTable params={parameters} />
              </TabsContent>
            )}

            {/* Request Body */}
            {hasBody && (
              <TabsContent value="body" className="mt-0 space-y-3">
                {requestBody.description && (
                  <p className="text-sm text-muted-foreground">{requestBody.description}</p>
                )}
                {isMultipart ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-mono bg-muted/50 border border-border rounded px-2 py-1 inline-block">
                      multipart/form-data
                    </p>
                    {requestSchema?.properties && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-border text-left">
                              <th className="pb-2 pr-4 font-medium text-muted-foreground">Field</th>
                              <th className="pb-2 pr-4 font-medium text-muted-foreground">Type</th>
                              <th className="pb-2 pr-4 font-medium text-muted-foreground">Required</th>
                              <th className="pb-2 font-medium text-muted-foreground">Description</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {Object.entries(requestSchema.properties).map(([key, val]) => (
                              <tr key={key}>
                                <td className="py-2 pr-4 font-mono text-foreground">{key}</td>
                                <td className="py-2 pr-4 font-mono text-muted-foreground">
                                  {val.format === "binary" ? "file" : (val.type || "string")}
                                </td>
                                <td className="py-2 pr-4">
                                  {requestSchema.required?.includes(key)
                                    ? <span className="text-red-500">required</span>
                                    : <span className="text-muted-foreground">optional</span>}
                                </td>
                                <td className="py-2 text-muted-foreground">{val.description || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : (
                  requestSchema && <JsonViewer data={resolveSchema(requestSchema, schemas)} />
                )}
              </TabsContent>
            )}

            {/* Responses */}
            {hasResponses && (
              <TabsContent value="response" className="mt-0">
                <ResponseList responses={responses} schemas={schemas} />
              </TabsContent>
            )}

            {/* cURL */}
            <TabsContent value="curl" className="mt-0">
              <div className="relative rounded-lg border border-border bg-muted/60 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted">
                  <span className="text-xs font-mono text-muted-foreground">bash</span>
                  <CopyButton text={curlSnippet} />
                </div>
                <pre className="p-4 text-xs font-mono text-foreground overflow-x-auto leading-relaxed whitespace-pre">
                  {curlSnippet}
                </pre>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
