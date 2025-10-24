"use client"

export function Features() {
  const features = [
    {
      title: "Faster iteration",
      description:
        "The platform for rapid progress. Let your team focus on shipping features instead of managing infrastructure.",
      icon: "⚡",
    },
    {
      title: "Make teamwork seamless",
      description: "Tools for your team and stakeholders to share feedback and iterate faster.",
      icon: "👥",
    },
    {
      title: "Deploy with confidence",
      description: "Built-in security, performance monitoring, and automatic scaling for production-ready apps.",
      icon: "🔒",
    },
    {
      title: "Collaborate in real-time",
      description: "Share your work instantly with team members and get feedback without leaving your workflow.",
      icon: "🔄",
    },
  ]

  return (
    <section id="features" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-4xl font-bold text-foreground">Powerful features</h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to build and deploy modern web applications
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {features.map((feature, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-8 hover:border-primary/50 transition">
              <div className="mb-4 text-4xl">{feature.icon}</div>
              <h3 className="mb-2 text-xl font-semibold text-foreground">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
