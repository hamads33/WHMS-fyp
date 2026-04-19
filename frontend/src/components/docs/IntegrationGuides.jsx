"use client";

import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { CopyButton } from "./CopyButton";
import { cn } from "@/lib/utils";
import {
  BookOpen, Globe, Code2, Layers, ChevronRight,
  CheckCircle2, AlertCircle, Info, ShoppingCart,
  ArrowRight, Zap, Link2,
} from "lucide-react";

/* ── Sidebar nav ──────────────────────────────────────────── */

const PLATFORMS = [
  { id: "overview",    label: "Overview",          icon: BookOpen     },
  { id: "hosted",      label: "Hosted Store",       icon: ShoppingCart },
  { id: "html",        label: "Plain HTML / Static", icon: Globe       },
  { id: "wordpress",   label: "WordPress",           icon: Layers      },
  { id: "nextjs",      label: "Next.js / React",     icon: Code2       },
  { id: "webflow",     label: "Webflow",              icon: Globe       },
  { id: "wix",         label: "Wix",                  icon: Globe       },
  { id: "api",         label: "REST API (headless)",  icon: Link2       },
];

/* ── Shared primitives ────────────────────────────────────── */

function CodeBlock({ code, lang = "html" }) {
  return (
    <div className="relative group rounded-lg border border-border bg-muted/60 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted">
        <span className="text-xs font-mono text-muted-foreground">{lang}</span>
        <CopyButton text={code} />
      </div>
      <pre className="p-4 text-sm font-mono text-foreground overflow-x-auto leading-relaxed whitespace-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function Callout({ type = "info", children }) {
  const styles = {
    info:    { icon: Info,         cls: "border-blue-200  bg-blue-50   text-blue-800  dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300"  },
    tip:     { icon: CheckCircle2, cls: "border-green-200 bg-green-50  text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300" },
    warning: { icon: AlertCircle,  cls: "border-amber-200 bg-amber-50  text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300" },
  };
  const { icon: Icon, cls } = styles[type] ?? styles.info;
  return (
    <div className={cn("flex gap-3 rounded-lg border px-4 py-3 text-sm", cls)}>
      <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}

function Step({ n, title, children }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold mt-0.5">
        {n}
      </div>
      <div className="flex-1 space-y-3 min-w-0">
        <h4 className="font-semibold text-foreground leading-none pt-1">{title}</h4>
        {children}
      </div>
    </div>
  );
}

/* ── Overview ─────────────────────────────────────────────── */

function Overview() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Integrating WHMS with Your Website</h2>
        <p className="text-muted-foreground leading-relaxed">
          WHMS handles the complete order lifecycle — plan browsing, cart, authentication,
          payment, and provisioning. There are two ways to connect your website to WHMS:
        </p>
      </div>

      {/* Two-approach comparison */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-xl border-2 border-primary bg-primary/5 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <ShoppingCart className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <p className="font-bold text-sm">Hosted Store</p>
              <p className="text-xs text-muted-foreground">Recommended</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Link your users to the WHMS-hosted storefront. WHMS takes care of
            everything — plan selection, cart, account creation, payment, and
            confirmation. No API key, no code, no maintenance.
          </p>
          <div className="space-y-1.5">
            {["Zero custom code needed", "Full cart & checkout UX included", "Works on any platform", "redirect_uri to return users"].map(f => (
              <div key={f} className="flex items-center gap-1.5 text-xs text-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <Code2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="font-bold text-sm">REST API (headless)</p>
              <p className="text-xs text-muted-foreground">Advanced / custom UI</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Call the WHMS public REST API directly and build your own checkout UI.
            Requires an API key and custom frontend code. Best for highly custom experiences.
          </p>
          <div className="space-y-1.5">
            {["Full UI control", "Requires API key", "Custom auth + order flow", "More development work"].map(f => (
              <div key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5 shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      <Callout type="tip">
        For most websites — WordPress, Webflow, Wix, static sites, or React apps — the{" "}
        <strong>Hosted Store</strong> approach is the right choice. Your users get a professional,
        fully managed checkout experience and you write zero backend code.
      </Callout>

      <div>
        <h3 className="text-base font-semibold text-foreground mb-3">How the Hosted Store works</h3>
        <div className="space-y-3">
          {[
            { step: "User clicks 'Buy Now'",    desc: "A link or button on your site points to your WHMS store URL." },
            { step: "Browse & add to cart",     desc: "User browses all active services and plans on the WHMS storefront." },
            { step: "Register or sign in",      desc: "WHMS prompts for account creation or login inline — no redirect to your site." },
            { step: "Pay the invoice",          desc: "Payment is processed. WHMS generates the invoice and marks it paid." },
            { step: "Provisioned & redirected", desc: "Account is provisioned automatically. User is redirected back to your site via redirect_uri." },
          ].map(({ step, desc }, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-primary">{i + 1}</span>
              </div>
              <div>
                <span className="text-sm font-semibold text-foreground">{step} — </span>
                <span className="text-sm text-muted-foreground">{desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-base font-semibold text-foreground mb-3">Your store URL</h3>
        <CodeBlock lang="text" code={`# Full store (all services)
https://your-whms-domain.com/store

# Filter to one service
https://your-whms-domain.com/store?serviceId=SERVICE_ID

# Redirect back after payment
https://your-whms-domain.com/store?redirect_uri=https://yoursite.com/thank-you

# Both
https://your-whms-domain.com/store?serviceId=SERVICE_ID&redirect_uri=https://yoursite.com/thank-you`} />
      </div>
    </div>
  );
}

/* ── Hosted Store ─────────────────────────────────────────── */

function HostedStore() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Hosted Store Integration</h2>
        <p className="text-muted-foreground leading-relaxed">
          The hosted store is a fully managed checkout page built into WHMS. Point users to it
          from any platform with a single link. No API keys, no widget scripts, no custom code required.
        </p>
      </div>

      <Callout type="tip">
        This is the recommended integration method for all platforms. WHMS manages the entire
        experience — browsing, cart, auth, payment, provisioning, and confirmation.
      </Callout>

      <div className="space-y-6">
        <Step n={1} title="Find your store URL">
          <p className="text-sm text-muted-foreground">
            Your WHMS hosted store is available at:
          </p>
          <CodeBlock lang="text" code={`https://your-whms-domain.com/store`} />
          <p className="text-sm text-muted-foreground">
            To pre-filter to a specific service, add the <code className="font-mono bg-muted px-1 rounded">serviceId</code> query parameter.
            Find service IDs in <strong>Admin → Services</strong>.
          </p>
          <CodeBlock lang="text" code={`https://your-whms-domain.com/store?serviceId=clx123abc`} />
        </Step>

        <Step n={2} title="(Optional) Set a redirect_uri to bring users back">
          <p className="text-sm text-muted-foreground">
            After a successful payment, WHMS will redirect the user back to this URL. You can
            show a custom thank-you page or trigger any post-purchase flow on your site.
          </p>
          <CodeBlock lang="text" code={`https://your-whms-domain.com/store?redirect_uri=https://yoursite.com/thank-you`} />
          <Callout type="info">
            The redirect happens 5 seconds after the confirmation screen. Users also see a
            "Go now" link if they don't want to wait.
          </Callout>
        </Step>

        <Step n={3} title="Add a Buy Now button to your site">
          <p className="text-sm text-muted-foreground">
            Simply link to your store URL. Style it however you like — it's just a hyperlink.
          </p>
          <CodeBlock lang="html" code={`<!-- Plain link -->
<a href="https://your-whms-domain.com/store?redirect_uri=https://yoursite.com/thank-you">
  Get Started
</a>

<!-- Styled button -->
<a
  href="https://your-whms-domain.com/store?redirect_uri=https://yoursite.com/thank-you"
  style="display:inline-block; background:#2563eb; color:#fff; padding:0.75rem 1.75rem;
         border-radius:8px; font-weight:600; text-decoration:none;"
>
  View Plans →
</a>`} />
        </Step>
      </div>

      <div>
        <h3 className="text-base font-semibold mb-3">Store URL parameters</h3>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-2.5 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Parameter</th>
                <th className="text-left px-4 py-2.5 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Required</th>
                <th className="text-left px-4 py-2.5 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[
                ["serviceId",    "No",  "Pre-filter the store to show only plans for this service ID."],
                ["redirect_uri", "No",  "URL to redirect to after successful payment. Must be a valid absolute URL."],
              ].map(([param, req, desc]) => (
                <tr key={param}>
                  <td className="px-4 py-3 font-mono text-xs text-primary">{param}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{req}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Callout type="warning">
        The <code className="font-mono">redirect_uri</code> is visible in the URL. It is only
        used for redirecting after payment — no sensitive data is passed back to it. If you need
        to verify the payment server-side, use a WHMS webhook (Admin → Settings → Webhooks).
      </Callout>
    </div>
  );
}

/* ── Plain HTML ───────────────────────────────────────────── */

function PlainHTML() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Plain HTML / Static Site Integration</h2>
        <p className="text-muted-foreground leading-relaxed">
          The simplest integration — works on any static site, Bootstrap template, or raw HTML page.
          Just add a styled button that links to your WHMS hosted store.
        </p>
      </div>

      <Callout type="tip">
        No API key, no JavaScript widget, no build step. One link is all you need.
      </Callout>

      <div className="space-y-6">
        <Step n={1} title="Add a Buy Now button to your pricing section">
          <CodeBlock lang="html" code={`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Our Hosting Plans</title>
</head>
<body>

  <section style="padding: 4rem 1rem; text-align: center; background: #f8fafc;">
    <h2 style="font-size: 2rem; font-weight: 800; margin-bottom: 0.5rem;">
      Simple, transparent pricing
    </h2>
    <p style="color: #64748b; margin-bottom: 2rem;">
      30-day money-back guarantee. Cancel anytime.
    </p>

    <!-- Link to your WHMS hosted store -->
    <a
      href="https://your-whms-domain.com/store?redirect_uri=https://yoursite.com/thank-you"
      style="display:inline-block; background:#2563eb; color:#fff;
             padding:0.875rem 2rem; border-radius:8px; font-weight:700;
             font-size:1rem; text-decoration:none; font-family:system-ui,sans-serif;"
    >
      View all plans →
    </a>

    <p style="margin-top:1rem; font-size:0.8rem; color:#94a3b8;">
      🔒 Secure checkout &nbsp;·&nbsp; 🛡️ 30-day guarantee &nbsp;·&nbsp; ⚡ Instant setup
    </p>
  </section>

</body>
</html>`} />
        </Step>

        <Step n={2} title="(Optional) Link to a specific service">
          <p className="text-sm text-muted-foreground">
            If you sell multiple products and want a "Buy Shared Hosting" button that goes
            straight to that service's plans, add <code className="font-mono bg-muted px-1 rounded text-xs">serviceId</code>.
          </p>
          <CodeBlock lang="html" code={`<a href="https://your-whms-domain.com/store?serviceId=YOUR_SERVICE_ID&redirect_uri=https://yoursite.com/thank-you">
  Get Shared Hosting →
</a>`} />
          <Callout type="info">
            Find your service IDs in <strong>WHMS Admin → Services</strong>. Each service card shows its ID.
          </Callout>
        </Step>

        <Step n={3} title="(Optional) Create a simple thank-you page">
          <p className="text-sm text-muted-foreground">
            If you set a <code className="font-mono bg-muted px-1 rounded text-xs">redirect_uri</code>, create that page
            on your site. WHMS will redirect users there after payment with no extra parameters.
          </p>
          <CodeBlock lang="html" code={`<!-- thank-you.html -->
<!DOCTYPE html>
<html lang="en">
<body style="font-family:system-ui,sans-serif; text-align:center; padding:4rem 1rem;">
  <h1 style="font-size:2rem;">🎉 Thank you for your order!</h1>
  <p style="color:#64748b; margin-top:0.5rem;">
    Your account is being set up. Check your email for login details.
  </p>
  <a href="/" style="color:#2563eb;">← Back to home</a>
</body>
</html>`} />
        </Step>
      </div>
    </div>
  );
}

/* ── WordPress ────────────────────────────────────────────── */

function WordPress() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">WordPress Integration</h2>
        <p className="text-muted-foreground leading-relaxed">
          Add a WHMS "Get Started" button to any WordPress page, post, or widget area.
          The simplest method needs no plugins — just a button linking to your hosted store.
        </p>
      </div>

      <div>
        <h3 className="text-base font-semibold mb-5">Method A — Button in the block editor (no coding)</h3>
        <div className="space-y-6">
          <Step n={1} title="Add a Button block">
            <p className="text-sm text-muted-foreground">
              In the WordPress block editor click <strong>+</strong> → search for <strong>Button</strong>.
              Set the link URL to your WHMS store:
            </p>
            <CodeBlock lang="text" code={`https://your-whms-domain.com/store?redirect_uri=https://yoursite.com/thank-you`} />
          </Step>
          <Step n={2} title="Style and publish">
            <p className="text-sm text-muted-foreground">
              Customise the button text and colour in the block settings, then publish. Done —
              users who click it land on the WHMS hosted store.
            </p>
          </Step>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-base font-semibold mb-5">Method B — Shortcode (reusable across pages)</h3>
        <div className="space-y-6">
          <Step n={1} title="Add the shortcode to your child theme's functions.php">
            <CodeBlock lang="php" code={`// wp-content/themes/your-child-theme/functions.php

function whms_store_button_shortcode( $atts ) {
    $atts = shortcode_atts( [
        'label'       => 'View Plans →',
        'service_id'  => '',
        'redirect'    => '',
        'color'       => '#2563eb',
    ], $atts, 'whms_store' );

    $base = 'https://your-whms-domain.com/store';
    $params = [];
    if ( ! empty( $atts['service_id'] ) ) $params['serviceId']    = $atts['service_id'];
    if ( ! empty( $atts['redirect']   ) ) $params['redirect_uri'] = $atts['redirect'];

    $url = $base . ( $params ? '?' . http_build_query( $params ) : '' );

    return sprintf(
        '<a href="%s" style="display:inline-block;background:%s;color:#fff;padding:.75rem 1.75rem;border-radius:8px;font-weight:700;text-decoration:none">%s</a>',
        esc_url( $url ),
        esc_attr( $atts['color'] ),
        esc_html( $atts['label'] )
    );
}
add_shortcode( 'whms_store', 'whms_store_button_shortcode' );`} />
          </Step>

          <Step n={2} title="Use the shortcode on any page or post">
            <CodeBlock lang="text" code={`<!-- Basic -->
[whms_store]

<!-- Custom label and colour -->
[whms_store label="Get Shared Hosting →" color="#6366f1"]

<!-- Link to a specific service with redirect -->
[whms_store service_id="clx123abc" redirect="https://yoursite.com/thank-you"]`} />
          </Step>
        </div>
      </div>

      <Callout type="tip">
        Using <strong>Elementor</strong>? Drag a <strong>Button widget</strong> and set its link
        to your WHMS store URL. No shortcodes needed.
      </Callout>
    </div>
  );
}

/* ── Next.js ──────────────────────────────────────────────── */

function NextJS() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Next.js / React Integration</h2>
        <p className="text-muted-foreground leading-relaxed">
          For React apps the recommended approach is a simple link to the WHMS hosted store.
          Optionally, detect the return from checkout using the <code className="font-mono bg-muted px-1 rounded text-sm">redirect_uri</code> callback.
        </p>
      </div>

      <Callout type="tip">
        No npm package to install, no API key to manage. WHMS handles the entire checkout UX
        on its own domain. Your app just provides the entry link and the post-purchase landing page.
      </Callout>

      <div>
        <h3 className="text-base font-semibold mb-5">Option A — Simple link (recommended)</h3>
        <div className="space-y-6">
          <Step n={1} title="Add a pricing CTA component">
            <CodeBlock lang="tsx" code={`// components/GetStarted.tsx

const WHMS_STORE = 'https://your-whms-domain.com/store';

interface GetStartedProps {
  serviceId?: string;
  label?: string;
}

export function GetStarted({ serviceId, label = 'Get Started →' }: GetStartedProps) {
  const params = new URLSearchParams();
  if (serviceId) params.set('serviceId', serviceId);
  params.set('redirect_uri', \`\${window.location.origin}/thank-you\`);

  const href = \`\${WHMS_STORE}?\${params.toString()}\`;

  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3
                 font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
    >
      {label}
    </a>
  );
}`} />
          </Step>

          <Step n={2} title="Use it on your pricing page">
            <CodeBlock lang="tsx" code={`// app/pricing/page.tsx
import { GetStarted } from '@/components/GetStarted';

export default function PricingPage() {
  return (
    <main className="py-16 text-center">
      <h1 className="text-4xl font-extrabold mb-4">Simple, transparent pricing</h1>
      <p className="text-muted-foreground mb-8">Cancel anytime · 30-day guarantee</p>
      <GetStarted label="Browse all plans →" />
    </main>
  );
}`} />
          </Step>

          <Step n={3} title="Create a thank-you page for the redirect">
            <CodeBlock lang="tsx" code={`// app/thank-you/page.tsx

export default function ThankYouPage() {
  return (
    <main className="py-16 text-center space-y-4">
      <div className="text-5xl">🎉</div>
      <h1 className="text-3xl font-extrabold">Order placed successfully!</h1>
      <p className="text-muted-foreground">
        Your account is being set up. Check your email for login details.
      </p>
      <a href="/" className="text-primary underline">← Back to home</a>
    </main>
  );
}`} />
          </Step>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-base font-semibold mb-5">Option B — Server-side payment verification (webhooks)</h3>
        <p className="text-sm text-muted-foreground mb-4">
          If you need to update your own database after a successful payment (e.g. mark a user
          as premium), use WHMS webhooks instead of relying on the <code className="font-mono bg-muted px-1 rounded text-xs">redirect_uri</code>.
        </p>
        <div className="space-y-6">
          <Step n={1} title="Register a webhook in WHMS Admin → Settings → Webhooks">
            <CodeBlock lang="text" code={`Endpoint URL:  https://yoursite.com/api/whms-webhook
Events:        order.activated, invoice.paid`} />
          </Step>
          <Step n={2} title="Handle the webhook in a Next.js API route">
            <CodeBlock lang="tsx" code={`// app/api/whms-webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const payload = await req.json();

  if (payload.event === 'invoice.paid') {
    const { clientId, invoiceId, amount } = payload.data;
    // Update your database, send a custom email, etc.
    console.log('Invoice paid:', { clientId, invoiceId, amount });
  }

  return NextResponse.json({ received: true });
}`} />
          </Step>
        </div>
      </div>
    </div>
  );
}

/* ── Webflow ──────────────────────────────────────────────── */

function Webflow() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Webflow Integration</h2>
        <p className="text-muted-foreground leading-relaxed">
          Add a WHMS store button to any Webflow page in under two minutes — no custom
          code or paid plan required for basic link integration.
        </p>
      </div>

      <div className="space-y-6">
        <Step n={1} title="Add a Button element to your page">
          <p className="text-sm text-muted-foreground">
            In the Webflow Designer, drag a <strong>Button</strong> element onto your canvas
            (or use an existing CTA button on your pricing section).
          </p>
        </Step>

        <Step n={2} title="Set the link to your WHMS store URL">
          <p className="text-sm text-muted-foreground">
            In the <strong>Element Settings</strong> panel, set the button type to{" "}
            <strong>External URL</strong> and paste your store link:
          </p>
          <CodeBlock lang="text" code={`https://your-whms-domain.com/store?redirect_uri=https://yoursite.webflow.io/thank-you`} />
        </Step>

        <Step n={3} title="Publish">
          <p className="text-sm text-muted-foreground">
            Click <strong>Publish</strong>. Users who click the button are taken to the WHMS
            hosted store. After payment they're redirected back to your <code className="font-mono bg-muted px-1 rounded text-xs">/thank-you</code> page.
          </p>
        </Step>
      </div>

      <Callout type="tip">
        To link different buttons to different services (e.g. Shared Hosting vs VPS), set
        a different <code className="font-mono">serviceId</code> query param on each button's URL.
      </Callout>

      <div>
        <h3 className="text-base font-semibold mb-3">Example: multiple plan buttons</h3>
        <CodeBlock lang="text" code={`<!-- Shared Hosting button -->
https://your-whms-domain.com/store?serviceId=SERVICE_ID_1&redirect_uri=https://yoursite.com/thank-you

<!-- VPS button -->
https://your-whms-domain.com/store?serviceId=SERVICE_ID_2&redirect_uri=https://yoursite.com/thank-you`} />
      </div>
    </div>
  );
}

/* ── Wix ──────────────────────────────────────────────────── */

function Wix() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Wix Integration</h2>
        <p className="text-muted-foreground leading-relaxed">
          Wix restricts arbitrary script execution, but integrating WHMS via the hosted store
          needs no scripts at all — just a button with a link.
        </p>
      </div>

      <Callout type="tip">
        This is the easiest WHMS integration on any platform. No Velo, no HTML components,
        no Wix paid plan required beyond the ability to add links.
      </Callout>

      <div className="space-y-6">
        <Step n={1} title="Add a Button widget to your page">
          <p className="text-sm text-muted-foreground">
            In the Wix Editor click <strong>Add Elements</strong> → <strong>Button</strong>.
            Drag it onto your pricing section.
          </p>
        </Step>

        <Step n={2} title="Set the button link to your WHMS store">
          <p className="text-sm text-muted-foreground">
            Click the button → <strong>Link</strong> → choose <strong>Web Address</strong> →
            paste your store URL:
          </p>
          <CodeBlock lang="text" code={`https://your-whms-domain.com/store?redirect_uri=https://yoursite.wixsite.com/mysite/thank-you`} />
        </Step>

        <Step n={3} title="Add a thank-you page (optional)">
          <p className="text-sm text-muted-foreground">
            In your Wix site, add a new page called <strong>Thank You</strong>.
            Set its URL to <code className="font-mono bg-muted px-1 rounded text-xs">/thank-you</code>.
            This is where users land after completing checkout.
          </p>
        </Step>

        <Step n={4} title="Publish">
          <p className="text-sm text-muted-foreground">
            Click <strong>Publish</strong>. Done — users click your button, WHMS handles checkout,
            they return to your thank-you page.
          </p>
        </Step>
      </div>
    </div>
  );
}

/* ── REST API (headless) ──────────────────────────────────── */

function RestAPI() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">REST API — Headless Integration</h2>
        <p className="text-muted-foreground leading-relaxed">
          If you need to build a fully custom checkout UI, WHMS exposes a public REST API.
          Use this when the hosted store doesn't fit your design requirements or when you
          need deep programmatic control.
        </p>
      </div>

      <Callout type="warning">
        The REST API approach requires significantly more development work. Consider the
        hosted store approach first — it provides the same end result with no custom code.
      </Callout>

      <div>
        <h3 className="text-base font-semibold mb-3">Public store endpoints (no auth required)</h3>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-2.5 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Endpoint</th>
                <th className="text-left px-4 py-2.5 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y text-xs font-mono">
              {[
                ["GET /api/store/services",       "All active services with plans and pricing"],
                ["GET /api/store/services/:id",    "Single service with plans"],
                ["GET /api/store/plans",           "All active plans (filter by ?serviceId=)"],
              ].map(([endpoint, desc]) => (
                <tr key={endpoint}>
                  <td className="px-4 py-3 text-primary">{endpoint}</td>
                  <td className="px-4 py-3 text-muted-foreground font-sans">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-base font-semibold mb-3">Public API endpoints (API key required)</h3>
        <p className="text-sm text-muted-foreground mb-3">
          All requests must include your public API key as a header. Generate one in{" "}
          <strong>Admin → Settings → API Keys</strong> (prefix <code className="font-mono bg-muted px-1 rounded">pk_</code>).
        </p>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-2.5 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Endpoint</th>
                <th className="text-left px-4 py-2.5 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y text-xs font-mono">
              {[
                ["POST /public/v1/clients",          "Register a new client"],
                ["POST /public/v1/auth/login",        "Login and get a client JWT"],
                ["POST /public/v1/orders",            "Place an order (client JWT required)"],
                ["GET  /public/v1/orders/:id/invoice","Get the invoice for an order"],
                ["POST /public/v1/invoices/:id/pay",  "Pay an invoice"],
              ].map(([endpoint, desc]) => (
                <tr key={endpoint}>
                  <td className="px-4 py-3 text-primary">{endpoint}</td>
                  <td className="px-4 py-3 text-muted-foreground font-sans">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-base font-semibold mb-3">Example: fetch plans (no auth)</h3>
        <CodeBlock lang="javascript" code={`const res = await fetch('https://your-whms-domain.com/api/store/services');
const { services } = await res.json();

// services[].plans[].pricing[].price — ready to render
console.log(services);`} />
      </div>

      <div>
        <h3 className="text-base font-semibold mb-3">Example: full order flow</h3>
        <CodeBlock lang="javascript" code={`const BASE    = 'https://your-whms-domain.com';
const API_KEY = 'pk_test_...';

const headers = {
  'Content-Type': 'application/json',
  'x-api-key': API_KEY,
};

// 1. Register
await fetch(\`\${BASE}/public/v1/clients\`, {
  method: 'POST', headers,
  body: JSON.stringify({ email: 'user@example.com', password: 'secret123' }),
});

// 2. Login
const { accessToken } = await fetch(\`\${BASE}/public/v1/auth/login\`, {
  method: 'POST', headers,
  body: JSON.stringify({ email: 'user@example.com', password: 'secret123' }),
}).then(r => r.json());

// 3. Place order
const { order, invoice } = await fetch(\`\${BASE}/public/v1/orders\`, {
  method: 'POST',
  headers: { ...headers, 'x-client-token': accessToken },
  body: JSON.stringify({ serviceId, planId, pricingId, billingCycles: 1 }),
}).then(r => r.json());

// 4. Pay invoice
await fetch(\`\${BASE}/public/v1/invoices/\${invoice.id}/pay\`, {
  method: 'POST',
  headers: { ...headers, 'x-client-token': accessToken },
  body: JSON.stringify({ gateway: 'manual' }),
});`} />
      </div>
    </div>
  );
}

/* ── Content map ──────────────────────────────────────────── */

const CONTENT = {
  overview:  Overview,
  hosted:    HostedStore,
  html:      PlainHTML,
  wordpress: WordPress,
  nextjs:    NextJS,
  webflow:   Webflow,
  wix:       Wix,
  api:       RestAPI,
};

/* ── Main component ───────────────────────────────────────── */

export function IntegrationGuides() {
  const [active, setActive] = useState("overview");
  const Content = CONTENT[active] ?? Overview;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-border bg-card h-screen sticky top-0 flex flex-col overflow-hidden">
        <div className="px-4 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
              <Globe className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground leading-none">Integration Guides</p>
              <p className="text-xs text-muted-foreground mt-0.5">Connect WHMS to any site</p>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0 py-2">
          <div className="px-2 space-y-0.5">
            {PLATFORMS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActive(id)}
                className={cn(
                  "w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-left transition-all duration-150",
                  active === id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{label}</span>
                {active === id && <ChevronRight className="h-3 w-3 ml-auto flex-shrink-0" />}
                {id === "hosted" && active !== id && (
                  <span className="ml-auto text-[9px] font-bold bg-primary/10 text-primary rounded-full px-1.5 py-0.5 flex-shrink-0">
                    NEW
                  </span>
                )}
              </button>
            ))}
          </div>

          <Separator className="my-3 mx-2" />

          <div className="mx-3 rounded-lg border border-border bg-muted/50 p-3 space-y-1.5">
            <p className="text-xs font-semibold text-foreground">Your store URL</p>
            <p className="text-xs text-muted-foreground leading-snug break-all font-mono">
              your-whms-domain.com/store
            </p>
            <p className="text-xs text-muted-foreground leading-snug">
              Share this link — no setup needed.
            </p>
          </div>
        </ScrollArea>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <Content />
          <Separator className="mt-14 mb-6" />
          <p className="text-center text-xs text-muted-foreground">
            WHMS Integration Guides · Hosted store at <code className="font-mono">/store</code> · REST API at <code className="font-mono">/public/v1</code>
          </p>
        </div>
      </main>
    </div>
  );
}
