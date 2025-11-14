import { Navbar } from "@/components/navbar"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-balance mb-6">WHMS</h1>
            <p className="text-lg text-foreground/70 text-balance mb-8 max-w-2xl mx-auto">
              WEB HOSTING MANAGEMENT SYSTEM
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <button className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity">
                Get Started
              </button>
              <button className="px-6 py-3 border border-border rounded-lg font-medium hover:bg-muted transition-colors">
                Learn More
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
