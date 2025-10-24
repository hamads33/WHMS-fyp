"use client"

import { Button } from "@/components/ui/button"

export function CTA() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl rounded-lg border border-border bg-card p-12 text-center">
        <h2 className="mb-4 text-3xl font-bold text-foreground">Ready to get started?</h2>
        <p className="mb-8 text-lg text-muted-foreground">
          Join thousands of teams building the future of the web with BuildHub.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
            Start Building Now
          </Button>
          <Button size="lg" variant="outline" className="border-border hover:bg-background bg-transparent">
            Schedule a Demo
          </Button>
        </div>
      </div>
    </section>
  )
}
