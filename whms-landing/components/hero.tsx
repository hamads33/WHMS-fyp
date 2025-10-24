"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl text-center">
        <div className="mb-6 inline-block rounded-full bg-primary/10 px-4 py-2">
          <span className="text-sm font-medium text-primary">✨ New: AI-Powered Features</span>
        </div>

        <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl text-balance">
          Build the web, <span className="text-primary">faster</span>
        </h1>

        <p className="mb-8 text-lg sm:text-xl text-muted-foreground text-balance">
          Your team's complete toolkit to stop configuring and start innovating. Securely build, deploy, and scale the
          best web experiences.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/auth/signup">
            <Button size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
              Get a demo
            </Button>
          </Link>
          <Button size="lg" variant="outline" className="w-full sm:w-auto border-border hover:bg-card bg-transparent">
            Explore the Product
          </Button>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-8 sm:grid-cols-4">
          {[
            { label: "20 days", desc: "saved on builds" },
            { label: "98%", desc: "faster to market" },
            { label: "300%", desc: "increase in SEO" },
            { label: "6x", desc: "faster to deploy" },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-2xl font-bold text-primary">{stat.label}</div>
              <div className="text-sm text-muted-foreground">{stat.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
