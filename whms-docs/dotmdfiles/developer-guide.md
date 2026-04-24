---
pdf_options:
  format: A4
  margin: 25mm 20mm 25mm 20mm
  printBackground: true
  headerTemplate: |
    <div style="width:100%;font-size:9px;color:#94a3b8;display:flex;justify-content:space-between;padding:0 20mm;box-sizing:border-box;font-family:'Inter',sans-serif;">
      <span>Developer Integration Guide</span>
      <span>Headless Billing API + Embed SDK</span>
    </div>
  footerTemplate: |
    <div style="width:100%;font-size:9px;color:#94a3b8;display:flex;justify-content:space-between;padding:0 20mm;box-sizing:border-box;font-family:'Inter',sans-serif;">
      <span>© 2026 WHMS. Confidential.</span>
      <span class="pageNumber"></span>
    </div>
  displayHeaderFooter: true
stylesheet: style.css
---

<div class="cover">
  <div class="cover-badge">Developer Documentation</div>
  <h1 class="cover-title">Developer Integration Guide</h1>
  <p class="cover-subtitle">Headless Billing API &amp; Embed SDK</p>
  <p class="cover-version">Version 1.0 &nbsp;·&nbsp; March 2026</p>
</div>

<div class="page-break"></div>

## Table of Contents

1. [Introduction](#introduction)
2. [Architecture Overview](#architecture-overview)
3. [Quick Start — React SDK](#quick-start--react-sdk)
4. [Script Tag Integration](#script-tag-integration)
5. [Authentication & API Keys](#authentication--api-keys)
6. [Public API Reference](#public-api-reference)
7. [JavaScript Fetch Examples](#javascript-fetch-examples)
8. [SDK Components](#sdk-components)
9. [SDK Hooks](#sdk-hooks)
10. [End-to-End Integration Flow](#end-to-end-integration-flow)
11. [Security Best Practices](#security-best-practices)
12. [SDK Package Structure](#sdk-package-structure)
13. [Use Case — Hosting Company](#use-case--hosting-company)
14. [Troubleshooting](#troubleshooting)

<div class="page-break"></div>

## Introduction

The WHMS Billing Engine is a **headless, API-first** billing platform that handles the full subscription lifecycle — from plan discovery to payment collection and invoice generation. It is designed to integrate cleanly into any existing website or application without requiring you to adopt a monolithic control panel.

### What the system provides

| Capability | Description |
|---|---|
| **Subscription Billing** | Recurring billing with configurable cycles (monthly, annually, etc.) |
| **Client Management** | Register and authenticate end-users via API |
| **Invoicing** | Itemised invoices with tax, discounts, and payment tracking |
| **Service Provisioning** | Attach plans to services with pricing, setup fees, and add-ons |
| **Embeddable UI** | Drop-in React components and a plain-script widget bundle |

### Why use this approach?

- **Works with any website** — static sites, WordPress, Next.js, plain HTML — anything with a `<script>` tag or a `npm install`
- **No platform lock-in** — your frontend stays exactly as it is; the billing layer is an external API
- **Modern API-first architecture** — every action is a plain HTTP call authenticated by a scoped API key
- **Ship in minutes** — one `<script>` tag is all you need to show a live pricing table

<div class="page-break"></div>

## Architecture Overview

The integration is a clean three-layer stack. Your website never touches the database directly — it communicates only through the public API layer.

```
┌─────────────────────────────────────────────────────────┐
│                    Your Website / App                   │
│                                                         │
│   ┌─────────────────┐     ┌────────────────────────┐   │
│   │  React SDK      │     │  <script> Widget       │   │
│   │  (npm package)  │     │  (dist/widget.js)      │   │
│   └────────┬────────┘     └───────────┬────────────┘   │
└────────────┼──────────────────────────┼────────────────┘
             │  HTTPS + x-api-key       │
             ▼                          ▼
┌─────────────────────────────────────────────────────────┐
│                Public API  /public/v1/                  │
│                                                         │
│   GET  /plans          POST /clients                    │
│   POST /orders         POST /auth/login                 │
│   GET  /invoices/:id   GET  /auth/me                    │
│                                                         │
│   ── apiKeyGuard ── requireScope ── publicClientAuth ── │
└────────────────────────────┬────────────────────────────┘
                             │
             ┌───────────────▼───────────────┐
             │         Billing Engine        │
             │                               │
             │  OrderService  InvoiceService │
             │  AuthService   PlanService    │
             │  ProvisioningService          │
             └───────────────┬───────────────┘
                             │
             ┌───────────────▼───────────────┐
             │         PostgreSQL            │
             │   (Prisma ORM)                │
             └───────────────────────────────┘
```

### Request flow

```
Browser  ──[1. API key]──►  Public API
         ◄─[2. Plans]──────  PlanService
         ──[3. Register]──►  AuthService  ──►  DB
         ──[4. Login]─────►  AuthService  ──►  JWT issued
         ──[5. Order]─────►  OrderService ──►  DB + Provisioning
         ──[6. Invoice]───►  InvoiceService ──► DB
```

<div class="page-break"></div>

## Quick Start — React SDK

The fastest way to embed billing into a React application.

### 1. Install

```bash
npm install @whms/billing-sdk
# peer dependencies (skip if already installed)
npm install react react-dom
```

### 2. Add a pricing table

```jsx
import { PricingTable } from "@whms/billing-sdk";

export default function PricingPage() {
  return (
    <PricingTable
      apiKey="pk_test_xxxxxxxxxxxx"
      baseUrl="https://api.example.com"
      onSelect={(plan, pricing) => {
        // plan   → { id, name, summary, ... }
        // pricing → { id, billingCycle, price, currency, ... }
        console.log("Selected:", plan.name, pricing.billingCycle);
      }}
    />
  );
}
```

### 3. Add a login widget

```jsx
import { LoginWidget } from "@whms/billing-sdk";

export default function AccountPage() {
  return (
    <LoginWidget
      apiKey="pk_test_xxxxxxxxxxxx"
      baseUrl="https://api.example.com"
      onLogin={({ user, accessToken }) => {
        // store accessToken for subsequent order / invoice requests
        sessionStorage.setItem("client_token", accessToken);
      }}
    />
  );
}
```

### 4. Show an order form

```jsx
import { OrderForm } from "@whms/billing-sdk";

export default function CheckoutPage({ planId, pricingId, serviceId }) {
  return (
    <OrderForm
      apiKey="pk_test_xxxxxxxxxxxx"
      baseUrl="https://api.example.com"
      serviceId={serviceId}
      planId={planId}
      pricingId={pricingId}
      onSuccess={({ order, costBreakdown, accessToken }) => {
        console.log("Order created:", order.id);
      }}
    />
  );
}
```

> **Next.js note:** All SDK components use React hooks and must run in the browser. In the App Router, add `"use client"` at the top of any file that imports SDK components.

<div class="page-break"></div>

## Script Tag Integration

No build tool, no npm — drop two tags into any HTML page.

### Pricing Table

```html
<!-- 1. Load the widget bundle once -->
<script src="https://cdn.example.com/widget.js"></script>

<!-- 2. Place a container anywhere on the page -->
<div id="pricing-table"></div>

<!-- 3. Initialise -->
<script>
  BillingWidget.renderPricingTable({
    elementId: "pricing-table",
    apiKey:    "pk_test_xxxxxxxxxxxx",
    baseUrl:   "https://api.example.com",
    onSelect:  function(plan, pricing) {
      console.log(plan.name, pricing.price, pricing.currency);
    }
  });
</script>
```

### Login widget

```html
<div id="login-box"></div>

<script>
  BillingWidget.renderLoginWidget({
    elementId: "login-box",
    apiKey:    "pk_test_xxxxxxxxxxxx",
    baseUrl:   "https://api.example.com",
    onLogin:   function(result) {
      window.__clientToken = result.accessToken;
    }
  });
</script>
```

### Invoice viewer

```html
<div id="invoice"></div>

<script>
  BillingWidget.renderInvoiceViewer({
    elementId:   "invoice",
    apiKey:      "pk_test_xxxxxxxxxxxx",
    baseUrl:     "https://api.example.com",
    invoiceId:   "inv_abc123",
    clientToken: window.__clientToken   // JWT from login
  });
</script>
```

### Available render methods

| Method | Description |
|---|---|
| `BillingWidget.renderPricingTable(opts)` | Plans grid with cycle selector |
| `BillingWidget.renderOrderForm(opts)` | Registration + checkout flow |
| `BillingWidget.renderLoginWidget(opts)` | Email/password login |
| `BillingWidget.renderInvoiceViewer(opts)` | Invoice detail with line items |

Each method returns `{ unmount }` — call `unmount()` to tear down the widget.

<div class="page-break"></div>

## Authentication & API Keys

### Key types

The system uses two categories of key. Keep them strictly separated.

| Key | Prefix | Used where | Exposes |
|---|---|---|---|
| **Public key** | `pk_` | Frontend, widget bundle, SDK | Plan data, login, order creation |
| **Secret key** | `sk_` | Backend server only | Admin operations, full billing access |

```
pk_test_a1b2c3d4e5f6...   ← safe to include in client-side code
sk_test_z9y8x7w6v5u4...   ← NEVER in frontend code
```

### Creating an API key

Keys are created through the admin portal or the management API.

```bash
curl -X POST https://api.example.com/api/auth/apikeys \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Website Widget",
    "scopes": [
      "plans.read",
      "clients.create",
      "auth.login",
      "orders.create",
      "invoices.read"
    ],
    "expiresInDays": 365
  }'
```

Response:

```json
{
  "rawKey": "pk_live_xxxxxxxxxxxxxxxxxxxx",
  "apiKeyId": "key_abc123",
  "scopes": ["plans.read","clients.create","auth.login","orders.create","invoices.read"]
}
```

> The raw key is shown **once**. Store it immediately — it cannot be retrieved again.

### Available scopes

| Scope | Grants access to |
|---|---|
| `plans.read` | `GET /public/v1/plans` |
| `clients.create` | `POST /public/v1/clients` |
| `auth.login` | `POST /public/v1/auth/login` and `GET /public/v1/auth/me` |
| `orders.create` | `POST /public/v1/orders` |
| `invoices.read` | `GET /public/v1/invoices/:id` |

A key with **no scopes** is treated as unrestricted — useful during development.

### Client authentication

Once an end-user logs in, they receive a short-lived JWT (`accessToken`). Pass this token in subsequent requests via the `x-client-token` header. The server validates ownership before returning order or invoice data.

```
x-api-key: pk_test_xxx          ← identifies your integration
x-client-token: eyJhbGci...     ← identifies the logged-in customer
```

<div class="page-break"></div>

## Public API Reference

Base URL: `https://api.example.com/public/v1`

All endpoints require the `x-api-key` header (or `Authorization: Bearer <key>`).

---

### GET /plans

Returns all active plans, optionally filtered by service.

**Query parameters**

| Parameter | Type | Description |
|---|---|---|
| `serviceId` | string (optional) | Filter plans to a specific service |

**Request**

```bash
curl https://api.example.com/public/v1/plans \
  -H "x-api-key: pk_test_xxxxxxxxxxxx"
```

**Response**

```json
{
  "success": true,
  "plans": [
    {
      "id": "plan_abc",
      "name": "Starter",
      "summary": "Perfect for small projects",
      "active": true,
      "position": 0,
      "pricing": [
        {
          "id": "price_xyz",
          "billingCycle": "monthly",
          "price": 9.99,
          "setupFee": 0,
          "currency": "USD",
          "active": true
        }
      ],
      "service": { "id": "svc_123", "name": "Web Hosting" }
    }
  ]
}
```

---

### GET /plans/:planId

Returns a single plan by ID.

```bash
curl https://api.example.com/public/v1/plans/plan_abc \
  -H "x-api-key: pk_test_xxxxxxxxxxxx"
```

---

### POST /clients

Registers a new client account.

**Request body**

| Field | Type | Required |
|---|---|---|
| `email` | string | Yes |
| `password` | string (min 8 chars) | Yes |

```bash
curl -X POST https://api.example.com/public/v1/clients \
  -H "x-api-key: pk_test_xxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepass123"
  }'
```

**Response** `201 Created`

```json
{
  "success": true,
  "client": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "emailVerified": false
  }
}
```

---

### POST /auth/login

Authenticates a client and returns JWT tokens.

```bash
curl -X POST https://api.example.com/public/v1/auth/login \
  -H "x-api-key: pk_test_xxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepass123"
  }'
```

**Response**

```json
{
  "success": true,
  "user": { "id": "usr_abc123", "email": "user@example.com" },
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiJ9..."
}
```

---

### GET /auth/me

Returns the currently authenticated client. Requires `Authorization: Bearer <accessToken>`.

```bash
curl https://api.example.com/public/v1/auth/me \
  -H "x-api-key: pk_test_xxxxxxxxxxxx" \
  -H "Authorization: Bearer eyJhbGci..."
```

---

### POST /orders

Creates an order for the authenticated client.

**Headers**

```
x-api-key: pk_test_xxxxxxxxxxxx
x-client-token: eyJhbGci...        ← required
Content-Type: application/json
```

**Request body**

| Field | Type | Required |
|---|---|---|
| `serviceId` | string | Yes |
| `planId` | string | Yes |
| `pricingId` | string | Yes |
| `billingCycles` | integer | No (default: 1) |
| `quantity` | integer | No (default: 1) |
| `addons` | string[] | No |

```bash
curl -X POST https://api.example.com/public/v1/orders \
  -H "x-api-key: pk_test_xxxxxxxxxxxx" \
  -H "x-client-token: eyJhbGci..." \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": "svc_123",
    "planId":    "plan_abc",
    "pricingId": "price_xyz",
    "billingCycles": 12
  }'
```

**Response** `201 Created`

```json
{
  "success": true,
  "order": {
    "id": "ord_xyz789",
    "status": "pending",
    "createdAt": "2026-03-23T10:00:00.000Z"
  },
  "costBreakdown": {
    "baseCost": 119.88,
    "setupFee": 0,
    "total": 119.88,
    "currency": "USD"
  }
}
```

---

### GET /invoices/:id

Returns a single invoice. The client token must belong to the invoice owner.

```bash
curl https://api.example.com/public/v1/invoices/inv_abc123 \
  -H "x-api-key: pk_test_xxxxxxxxxxxx" \
  -H "x-client-token: eyJhbGci..."
```

**Response**

```json
{
  "success": true,
  "invoice": {
    "id": "inv_abc123",
    "invoiceNumber": "INV-2026-00042",
    "status": "unpaid",
    "currency": "USD",
    "subtotal": 119.88,
    "taxAmount": 0,
    "discountAmount": 0,
    "totalAmount": 119.88,
    "amountDue": 119.88,
    "dueDate": "2026-04-22T00:00:00.000Z",
    "issuedAt": "2026-03-23T10:00:00.000Z",
    "lineItems": [
      {
        "id": "li_001",
        "description": "Starter — monthly × 12",
        "quantity": 12,
        "unitPrice": 9.99,
        "total": 119.88,
        "taxRate": 0,
        "taxAmount": 0
      }
    ]
  }
}
```

---

### Error responses

All errors follow the same shape:

```json
{ "error": "Human-readable error message" }
```

| HTTP status | Meaning |
|---|---|
| `400` | Validation error — check your request body |
| `401` | Missing or invalid API key / client token |
| `403` | Insufficient scope or ownership mismatch |
| `404` | Resource not found |
| `409` | Conflict — e.g. email already registered |
| `500` | Internal server error |

<div class="page-break"></div>

## JavaScript Fetch Examples

Use these patterns in any environment that supports the Fetch API (browser, Node 18+, Deno, Cloudflare Workers).

### Helper wrapper

```js
const BASE    = "https://api.example.com/public/v1";
const API_KEY = "pk_test_xxxxxxxxxxxx";

async function billingFetch(path, options = {}) {
  const { clientToken, ...init } = options;

  const headers = {
    "Content-Type": "application/json",
    "x-api-key": API_KEY,
    ...init.headers,
  };

  if (clientToken) headers["x-client-token"] = clientToken;

  const res  = await fetch(`${BASE}${path}`, { ...init, headers });
  const data = await res.json();

  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}
```

### Fetch plans

```js
const { plans } = await billingFetch("/plans");
```

### Register + login

```js
// Register (ignore duplicate email errors)
try {
  await billingFetch("/clients", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
} catch (err) {
  if (!err.message.includes("already registered")) throw err;
}

// Login
const { accessToken, user } = await billingFetch("/auth/login", {
  method: "POST",
  body: JSON.stringify({ email, password }),
});
```

### Create order

```js
const { order, costBreakdown } = await billingFetch("/orders", {
  method: "POST",
  clientToken: accessToken,
  body: JSON.stringify({ serviceId, planId, pricingId }),
});
```

### Retrieve invoice

```js
const { invoice } = await billingFetch(`/invoices/${invoiceId}`, {
  clientToken: accessToken,
});
```

<div class="page-break"></div>

## SDK Components

The SDK exports four ready-to-use React components. Each component is self-contained — it fetches its own data and manages its own loading/error state.

---

### PricingTable

Fetches all active plans and renders them as a responsive card grid. Each card shows the plan name, description, pricing (with a billing-cycle selector when multiple cycles are available), and a CTA button.

```jsx
import { PricingTable } from "@whms/billing-sdk";

<PricingTable
  apiKey="pk_test_xxx"
  baseUrl="https://api.example.com"
  serviceId="svc_123"          // optional — filters to one service
  onSelect={(plan, pricing) => {
    // Called when the user clicks "Select plan"
    navigate(`/checkout?planId=${plan.id}&pricingId=${pricing.id}`);
  }}
  className="my-pricing-grid"  // optional — override root CSS class
/>
```

**Props**

| Prop | Type | Required | Description |
|---|---|---|---|
| `apiKey` | string | Yes | Public API key |
| `baseUrl` | string | Yes | Base URL of your billing API |
| `serviceId` | string | No | Filter plans to a specific service |
| `onSelect` | `(plan, pricing) => void` | No | Called on plan selection |
| `className` | string | No | CSS class for the root element |

---

### OrderForm

Handles the full checkout flow in one component: register a new client account (or silently skip if the email already exists), log in to obtain a client token, then create the order.

```jsx
import { OrderForm } from "@whms/billing-sdk";

<OrderForm
  apiKey="pk_test_xxx"
  baseUrl="https://api.example.com"
  serviceId="svc_123"
  planId="plan_abc"
  pricingId="price_xyz"
  onSuccess={({ order, costBreakdown, accessToken }) => {
    // Redirect to a confirmation page, show a thank-you modal, etc.
    router.push(`/orders/${order.id}/confirmation`);
  }}
/>
```

**Props**

| Prop | Type | Required | Description |
|---|---|---|---|
| `apiKey` | string | Yes | Public API key |
| `baseUrl` | string | Yes | Base URL of your billing API |
| `serviceId` | string | Yes | Target service |
| `planId` | string | Yes | Selected plan |
| `pricingId` | string | Yes | Selected pricing option |
| `onSuccess` | `({ order, costBreakdown, accessToken }) => void` | No | Called after successful order |

---

### LoginWidget

A minimal email/password form. On successful login, the access token is persisted in `localStorage` via the `useAuth` hook. When the user is already logged in, the widget displays their email and a logout button.

```jsx
import { LoginWidget } from "@whms/billing-sdk";

<LoginWidget
  apiKey="pk_test_xxx"
  baseUrl="https://api.example.com"
  onLogin={({ user, accessToken }) => {
    // Optionally sync the token into your own state manager
    dispatch({ type: "SET_AUTH", payload: { user, accessToken } });
  }}
/>
```

**Props**

| Prop | Type | Required | Description |
|---|---|---|---|
| `apiKey` | string | Yes | Public API key |
| `baseUrl` | string | Yes | Base URL of your billing API |
| `onLogin` | `({ user, accessToken, refreshToken }) => void` | No | Called after successful login |
| `className` | string | No | CSS class for the root element |

---

### InvoiceViewer

Displays a formatted invoice: number, status badge, issued/due dates, itemised line-item table, and a totals summary with tax and discounts.

```jsx
import { InvoiceViewer } from "@whms/billing-sdk";

<InvoiceViewer
  apiKey="pk_test_xxx"
  baseUrl="https://api.example.com"
  invoiceId="inv_abc123"
  clientToken={accessToken}  // JWT from login — required for ownership check
/>
```

**Props**

| Prop | Type | Required | Description |
|---|---|---|---|
| `apiKey` | string | Yes | Public API key |
| `baseUrl` | string | Yes | Base URL of your billing API |
| `invoiceId` | string | Yes | Invoice ID to display |
| `clientToken` | string | Yes | Client JWT from login |
| `className` | string | No | CSS class for the root element |

<div class="page-break"></div>

## SDK Hooks

For custom UI, import the hooks directly instead of the pre-built components.

---

### usePlans

```js
import { usePlans } from "@whms/billing-sdk";

const { plans, loading, error, refetch } = usePlans({
  apiKey:    "pk_test_xxx",
  baseUrl:   "https://api.example.com",
  serviceId: "svc_123",  // optional
});
```

**Returns**

| Field | Type | Description |
|---|---|---|
| `plans` | `Plan[]` | Array of active plans (empty while loading) |
| `loading` | boolean | `true` while the request is in flight |
| `error` | `string \| null` | Error message, or `null` on success |
| `refetch` | `() => void` | Manually re-trigger the fetch |

---

### useAuth

```js
import { useAuth } from "@whms/billing-sdk";

const { user, token, loading, error, login, logout, register } = useAuth({
  apiKey:  "pk_test_xxx",
  baseUrl: "https://api.example.com",
});

// Login
const result = await login("user@example.com", "password123");
// → result: { user, accessToken, refreshToken }

// Register
const client = await register("new@example.com", "password123");

// Logout (clears localStorage)
logout();
```

**Returns**

| Field | Type | Description |
|---|---|---|
| `user` | `Client \| null` | Currently authenticated user |
| `token` | `string \| null` | Access token (also in `localStorage`) |
| `loading` | boolean | `true` during async operations |
| `error` | `string \| null` | Last error message |
| `login` | `async (email, password) => AuthResult` | Authenticate a client |
| `logout` | `() => void` | Clear session |
| `register` | `async (email, password) => Client` | Create a new account |

<div class="page-break"></div>

## End-to-End Integration Flow

A typical integration from zero to accepting orders takes five steps.

```
Step 1 ── Install SDK ───────────────────────────────────────┐
                                                             │
  npm install @whms/billing-sdk                              │
  # or load dist/widget.js via <script>                      │
                                                             │
Step 2 ── Create API key ─────────────────────────────────── │
                                                             │
  Admin Portal → API Keys → New Key                         │
  Scopes: plans.read  clients.create  auth.login             │
          orders.create  invoices.read                       │
                                                             │
Step 3 ── Embed pricing table ────────────────────────────── │
                                                             │
  <PricingTable                                              │
    apiKey="pk_live_xxx"                                     │
    baseUrl="https://api.example.com"                        │
    onSelect={(plan, pricing) => setSelected({ plan,         │
      pricing })}                                            │
  />                                                         │
                                                             │
Step 4 ── Accept orders ──────────────────────────────────── │
                                                             │
  When a plan is selected, render <OrderForm> with           │
  the planId and pricingId. The component handles            │
  registration, login, and order creation automatically.     │
                                                             │
Step 5 ── Manage clients ─────────────────────────────────── │
                                                             │
  Clients appear instantly in the Admin Portal.              │
  Orders, invoices, and provisioning are all                 │
  handled automatically.                                     │
└────────────────────────────────────────────────────────────┘
```

### Full React page example

```jsx
"use client";  // Next.js App Router only
import { useState } from "react";
import { PricingTable, OrderForm } from "@whms/billing-sdk";

const API_KEY = "pk_live_xxxxxxxxxxxx";
const BASE    = "https://api.example.com";

export default function GetStartedPage() {
  const [selected, setSelected] = useState(null);

  if (selected) {
    return (
      <OrderForm
        apiKey={API_KEY}
        baseUrl={BASE}
        serviceId={selected.plan.service.id}
        planId={selected.plan.id}
        pricingId={selected.pricing.id}
        onSuccess={({ order }) => alert(`Order #${order.id} created!`)}
      />
    );
  }

  return (
    <PricingTable
      apiKey={API_KEY}
      baseUrl={BASE}
      onSelect={setSelected}
    />
  );
}
```

<div class="page-break"></div>

## Security Best Practices

### The golden rule

> **Never include your secret key (`sk_`) in any client-side code, bundle, or repository.**

Your public key (`pk_`) is designed to be embedded in frontend code. Your secret key must only ever exist on a backend server you control.

---

### Key management checklist

```
✅  Use pk_ keys in all frontend / SDK / widget code
✅  Restrict pk_ keys to the minimum required scopes
✅  Set an expiry date on all API keys
✅  Rotate keys immediately if you suspect exposure
✅  Store sk_ keys in environment variables only
✅  Use separate keys for development and production

❌  Do NOT commit API keys to version control
❌  Do NOT share sk_ keys in Slack, email, or tickets
❌  Do NOT include sk_ keys in client-side bundles
❌  Do NOT log raw API keys in server logs
```

---

### Environment variable pattern

```bash
# .env (never commit this file)
BILLING_API_KEY=pk_live_xxxxxxxxxxxx
BILLING_BASE_URL=https://api.example.com
```

```jsx
// Safe — pk_ key read from environment at build time
<PricingTable
  apiKey={process.env.NEXT_PUBLIC_BILLING_API_KEY}
  baseUrl={process.env.NEXT_PUBLIC_BILLING_BASE_URL}
/>
```

---

### CORS

The billing API allows requests from configured origin URLs only. Add your website domain to the allowed origins list in the Admin Portal → Settings → CORS. If you see CORS errors during development, add `http://localhost:3000` (or your local port) to the allowed list.

---

### Content Security Policy

If your site uses a CSP header, whitelist the billing API domain:

```
Content-Security-Policy: connect-src 'self' https://api.example.com;
```

<div class="page-break"></div>

## SDK Package Structure

```
packages/billing-sdk/
│
├── build.js                     # esbuild build script
├── package.json
│
├── src/
│   ├── index.js                 # Library entry — named exports
│   ├── embed.js                 # Widget bundle entry (window.BillingWidget)
│   │
│   ├── lib/
│   │   └── createClient.js      # Core API factory function
│   │
│   ├── hooks/
│   │   ├── usePlans.js          # Fetch & cache active plans
│   │   └── useAuth.js           # Login / logout / register + localStorage
│   │
│   └── components/
│       ├── PricingTable.jsx     # Plan card grid
│       ├── OrderForm.jsx        # Registration + checkout flow
│       ├── LoginWidget.jsx      # Email/password login form
│       └── InvoiceViewer.jsx    # Invoice detail + line items
│
└── dist/                        # Generated by npm run build
    ├── index.js                 # CJS  (require())
    ├── index.mjs                # ESM  (import)
    └── widget.js                # IIFE (window.BillingWidget)
```

### Build output summary

| File | Format | React bundled | Use case |
|---|---|---|---|
| `dist/index.mjs` | ESM | No (peer dep) | Modern bundlers, Vite, Next.js |
| `dist/index.js` | CJS | No (peer dep) | Node.js, older bundlers |
| `dist/widget.js` | IIFE | **Yes** | `<script>` tag, no bundler needed |

### Building

```bash
cd packages/billing-sdk
npm install
npm run build
```

<div class="page-break"></div>

## Use Case — Hosting Company

This section walks through a complete real-world scenario: a hosting company adding a fully functional billing flow to their existing marketing website.

### Scenario

> **AcmeHost** runs a static marketing website (`acmehost.com`) built with plain HTML and Bootstrap. They want to add a pricing page that shows their hosting plans and lets visitors order directly — without rebuilding their site or adopting a new platform.

---

### Step 1 — Generate a public API key

The AcmeHost admin logs into the billing portal and creates a new API key named `"Website Widget"` with scopes:

```
plans.read   clients.create   auth.login   orders.create   invoices.read
```

---

### Step 2 — Add the widget to the pricing page

```html
<!-- acmehost.com/pricing.html -->
<link rel="stylesheet" href="/assets/bootstrap.min.css">

<section class="container py-5">
  <h2 class="text-center mb-4">Choose your plan</h2>
  <div id="acmehost-pricing"></div>
</section>

<!-- Load the widget bundle -->
<script src="https://cdn.example.com/widget.js"></script>
<script>
  var selectedPlan = null;

  BillingWidget.renderPricingTable({
    elementId: "acmehost-pricing",
    apiKey:    "pk_live_xxxxxxxxxxxx",
    baseUrl:   "https://billing.acmehost.com",
    onSelect:  function(plan, pricing) {
      selectedPlan = { plan: plan, pricing: pricing };
      document.getElementById("order-section").style.display = "block";
      document.getElementById("order-section").scrollIntoView();

      // Re-render the order form with the selected plan
      BillingWidget.renderOrderForm({
        elementId: "acmehost-order",
        apiKey:    "pk_live_xxxxxxxxxxxx",
        baseUrl:   "https://billing.acmehost.com",
        serviceId: plan.service.id,
        planId:    plan.id,
        pricingId: pricing.id,
        onSuccess: function(result) {
          window.location.href = "/thank-you.html?order=" + result.order.id;
        }
      });
    }
  });
</script>

<!-- Order form — hidden until a plan is selected -->
<section id="order-section" class="container py-5" style="display:none">
  <h2 class="text-center mb-4">Complete your order</h2>
  <div id="acmehost-order" class="mx-auto" style="max-width:400px"></div>
</section>
```

---

### Step 3 — Go live

AcmeHost deploys `pricing.html`. Within minutes:

- Visitors see live plans pulled directly from the billing engine
- New customers register and place orders through the embedded form
- Orders appear instantly in the admin portal
- Invoices are generated and sent automatically
- Provisioning workflows trigger on order confirmation

**No backend code was written. No database was touched. Total integration time: under 30 minutes.**

<div class="page-break"></div>

## Troubleshooting

### `401 — API key required` or `Invalid or expired API key`

- Verify the key is being sent as `x-api-key: <your-key>` or `Authorization: Bearer <your-key>`
- Confirm the key has not expired — check the Admin Portal → API Keys
- Confirm the key has not been revoked
- For production keys, confirm you are using the `pk_live_` prefix, not `pk_test_`

---

### `403 — Insufficient scope`

Your API key does not have the required scope for this endpoint.

```
Required: orders.create
Your key scopes: plans.read, auth.login
```

Go to Admin Portal → API Keys → edit the key and add the missing scope.

---

### `403 — Access denied` on invoices

The `x-client-token` you provided does not belong to the owner of this invoice. Ensure you are passing the token returned from the login call made by the correct user.

---

### CORS errors in the browser

```
Access to fetch at 'https://api.example.com' from origin 'https://mysite.com'
has been blocked by CORS policy
```

Add your site's origin to the allowed list:

- Admin Portal → Settings → CORS Origins → Add `https://mysite.com`
- In development, add `http://localhost:3000`

---

### `TypeError: Failed to fetch` / network errors

- Confirm the `baseUrl` does not have a trailing slash: `https://api.example.com` ✅ not `https://api.example.com/` ❌
- Check that the billing API server is running and reachable
- Verify firewall / reverse proxy rules are not blocking `/public/v1/*` routes

---

### Plans not showing (`plans: []`)

- Confirm at least one plan is marked **active** in Admin Portal → Services → Plans
- If using `serviceId`, confirm the ID is correct and the service is published
- Check that the API key has the `plans.read` scope

---

### `409 — Email already registered`

The `POST /public/v1/clients` endpoint returned a conflict. The `OrderForm` component handles this automatically by attempting a login instead. If you are calling the endpoint manually, catch the `409` and proceed to login:

```js
try {
  await billingFetch("/clients", { method: "POST", body: JSON.stringify({ email, password }) });
} catch (err) {
  if (!err.message.includes("already registered")) throw err;
  // continue to login
}
```

---

### Widget does not render (script tag)

- Confirm the `elementId` matches an element that exists in the DOM **before** the script runs
- Move the `<script>` tag to just before `</body>`, or wrap the render call in `DOMContentLoaded`:

```html
<script>
  document.addEventListener("DOMContentLoaded", function() {
    BillingWidget.renderPricingTable({ elementId: "pricing", ... });
  });
</script>
```

---

*For further support, contact the platform team or open an issue in the internal repository.*
