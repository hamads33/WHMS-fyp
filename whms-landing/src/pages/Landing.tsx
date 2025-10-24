"use client"

import { useState } from "react"
import { Link } from "react-router-dom"
import Navigation from "../components/Navigation"
import Footer from "../components/Footer"
import { ArrowRight, Server, Zap, Shield, BarChart3, Users, Cpu } from "lucide-react"

export default function Landing() {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent rounded-full mix-blend-multiply filter blur-3xl opacity-10"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent rounded-full mix-blend-multiply filter blur-3xl opacity-10"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="text-center space-y-8">
            <div className="inline-block">
              <span className="text-xs font-mono text-muted-foreground bg-border px-3 py-1 rounded-full border border-border">
                Next-generation hosting management
              </span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-balance">
              The future of hosting management
            </h1>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
              WHMS is built for modern hosting providers. Manage servers, domains, and customers with unprecedented
              speed and simplicity.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center px-8 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-opacity-90 transition-all"
              >
                Get Started Free
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-8 py-3 border border-border hover:bg-border/50 font-medium rounded-lg transition-all"
              >
                Sign In
              </Link>
            </div>

            <div className="pt-12 grid grid-cols-3 gap-8 max-w-2xl mx-auto text-sm">
              <div>
                <div className="font-bold text-lg">99.99%</div>
                <div className="text-muted-foreground">Uptime SLA</div>
              </div>
              <div>
                <div className="font-bold text-lg">10M+</div>
                <div className="text-muted-foreground">Domains Managed</div>
              </div>
              <div>
                <div className="font-bold text-lg">50K+</div>
                <div className="text-muted-foreground">Active Providers</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-b border-border py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">Powerful features for modern providers</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Everything you need to scale your hosting business without the complexity
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Server,
                title: "Server Management",
                description:
                  "Provision, monitor, and manage servers across multiple data centers with a single interface.",
              },
              {
                icon: Zap,
                title: "Lightning Fast",
                description: "Built for speed. Deploy changes in milliseconds, not minutes. Optimized for performance.",
              },
              {
                icon: Shield,
                title: "Enterprise Security",
                description: "Bank-grade encryption, role-based access control, and comprehensive audit logs.",
              },
              {
                icon: BarChart3,
                title: "Advanced Analytics",
                description: "Real-time insights into your infrastructure, customer usage, and revenue metrics.",
              },
              {
                icon: Users,
                title: "Customer Portal",
                description: "White-label customer interface for managing their hosting and domains.",
              },
              {
                icon: Cpu,
                title: "API First",
                description: "Comprehensive REST API for complete automation and integration with your systems.",
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                onMouseEnter={() => setHoveredFeature(idx)}
                onMouseLeave={() => setHoveredFeature(null)}
                className={`p-6 rounded-lg border transition-all duration-300 cursor-pointer ${
                  hoveredFeature === idx ? "border-accent bg-accent/5" : "border-border hover:border-muted"
                }`}
              >
                <feature.icon
                  className={`w-8 h-8 mb-4 transition-colors ${
                    hoveredFeature === idx ? "text-accent" : "text-muted-foreground"
                  }`}
                />
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="border-b border-border py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-muted-foreground text-lg">Scale as you grow. No hidden fees.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Starter",
                price: "$99",
                description: "Perfect for small providers",
                features: ["Up to 100 servers", "Basic analytics", "Email support", "API access"],
              },
              {
                name: "Professional",
                price: "$299",
                description: "For growing businesses",
                features: [
                  "Up to 1,000 servers",
                  "Advanced analytics",
                  "Priority support",
                  "Custom integrations",
                  "White-label portal",
                ],
                highlighted: true,
              },
              {
                name: "Enterprise",
                price: "Custom",
                description: "For large-scale operations",
                features: [
                  "Unlimited servers",
                  "Custom analytics",
                  "24/7 phone support",
                  "Dedicated account manager",
                  "SLA guarantee",
                ],
              },
            ].map((plan, idx) => (
              <div
                key={idx}
                className={`rounded-lg border p-8 transition-all ${
                  plan.highlighted ? "border-accent bg-accent/5 ring-1 ring-accent" : "border-border hover:border-muted"
                }`}
              >
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-muted-foreground text-sm mb-6">{plan.description}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.price !== "Custom" && <span className="text-muted-foreground">/month</span>}
                </div>
                <button
                  className={`w-full py-2 rounded-lg font-medium mb-8 transition-all ${
                    plan.highlighted
                      ? "bg-primary text-primary-foreground hover:bg-opacity-90"
                      : "border border-border hover:bg-border/50"
                  }`}
                >
                  Get Started
                </button>
                <ul className="space-y-3">
                  {plan.features.map((feature, fidx) => (
                    <li key={fidx} className="flex items-center text-sm">
                      <span className="w-1.5 h-1.5 bg-accent rounded-full mr-3"></span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-b border-border py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold mb-6">Ready to transform your hosting business?</h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
            Join thousands of hosting providers already using WHMS to scale their operations.
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center justify-center px-8 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-opacity-90 transition-all"
          >
            Start Your Free Trial
            <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
