"use client"

import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"

export function Pricing() {
  const plans = [
    {
      name: "Free",
      price: "$0",
      description: "For people looking to explore",
      features: [
        "$5 of included monthly credits",
        "Deploy apps to Vercel",
        "Edit visually with Design Mode",
        "Sync with GitHub",
      ],
      cta: "Start Building",
      highlighted: false,
    },
    {
      name: "Premium",
      price: "$20",
      period: "/month",
      description: "For higher limits and power users",
      features: [
        "$20 of included monthly credits",
        "Purchase additional credits outside of your monthly usage",
        "5x higher attachment size limit",
        "Import from Figma",
        "Access to v0 API",
      ],
      cta: "Upgrade to Premium",
      highlighted: false,
    },
    {
      name: "Team",
      price: "$30",
      period: "/user/month",
      description: "For fast moving teams and collaboration",
      features: [
        "$30 of included monthly credits per user",
        "Purchase additional credits outside of your monthly usage shared across your team",
        "Centralized billing on vercel.com",
        "Share chats and collaborate with your team",
        "Access to v0 API",
      ],
      cta: "Start a Team plan",
      highlighted: true,
    },
  ]

  return (
    <section id="pricing" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <div className="mb-4 inline-block rounded-full bg-primary/10 px-4 py-2">
            <span className="text-sm font-medium text-primary">New: Credit-Based Pricing</span>
          </div>
          <h2 className="mb-4 text-4xl font-bold text-foreground">Plans and Pricing</h2>
          <p className="text-lg text-muted-foreground">
            Get started immediately for free. Upgrade for more credits, usage and collaboration.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`rounded-lg border p-8 transition ${
                plan.highlighted
                  ? "border-primary bg-card ring-2 ring-primary/20"
                  : "border-border bg-card hover:border-primary/50"
              }`}
            >
              {plan.highlighted && (
                <div className="mb-4 inline-block rounded-full bg-primary/20 px-3 py-1">
                  <span className="text-xs font-semibold text-primary">Recommended</span>
                </div>
              )}

              <h3 className="mb-2 text-2xl font-bold text-foreground">{plan.name}</h3>
              <div className="mb-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
              </div>
              <p className="mb-6 text-sm text-muted-foreground">{plan.description}</p>

              <Button
                className={`w-full mb-8 ${
                  plan.highlighted
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                    : "bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                }`}
              >
                {plan.cta}
              </Button>

              <div className="space-y-4">
                {plan.features.map((feature, j) => (
                  <div key={j} className="flex gap-3">
                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
