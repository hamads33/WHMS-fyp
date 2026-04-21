import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="bg-white text-black font-body selection:bg-black selection:text-white">
      {/* TopNavBar */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-black/5">
        <div className="flex justify-between items-center px-8 py-5 max-w-7xl mx-auto font-sans text-xs tracking-widest uppercase">
          <div className="font-headline text-2xl italic normal-case tracking-tight text-black">WHMS</div>
          <div className="hidden md:flex gap-10">
            <Link className="text-black font-semibold border-b border-black" href="#">Platform</Link>
            <Link className="text-zinc-500 hover:text-black transition-colors" href="#">Console</Link>
            <Link className="text-zinc-500 hover:text-black transition-colors" href="#">Developers</Link>
            <Link className="text-zinc-500 hover:text-black transition-colors" href="#">Pricing</Link>
            <Link className="text-zinc-500 hover:text-black transition-colors" href="#">Docs</Link>
          </div>
          <Link href="/register" className="bg-black text-white font-bold px-6 py-2 transition-all hover:bg-zinc-800 active:scale-95">
            START FREE
          </Link>
        </div>
      </nav>

      <main className="pt-32">
        {/* Hero Section */}
        <section className="px-8 max-w-7xl mx-auto text-center mb-32">
          <h1 className="text-7xl md:text-9xl font-headline font-normal tracking-tight mb-10 leading-[0.9] text-black">
            One console for <span className="italic block md:inline">hosting ops.</span>
          </h1>
          <p className="max-w-xl mx-auto text-zinc-600 text-lg md:text-xl leading-relaxed mb-16 font-light">
            WHMS is the unified command plane for servers, billing, and support. Stop switching tabs. Start shipping.
          </p>

          {/* Browser Dashboard Preview (Light Mode) */}
          <div className="relative group mx-auto max-w-5xl overflow-hidden monolith-border bg-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)]">
            <div className="bg-zinc-50 px-4 py-3 flex items-center gap-2 border-b border-black/5">
              <div className="flex gap-2">
                <div className="w-2.5 h-2.5 rounded-full border border-black/20"></div>
                <div className="w-2.5 h-2.5 rounded-full border border-black/20"></div>
                <div className="w-2.5 h-2.5 rounded-full border border-black/20"></div>
              </div>
              <div className="mx-auto bg-white border border-black/10 rounded px-4 py-1 text-[10px] text-zinc-400 font-mono w-1/3">
                console.whms.io/fleet/overview
              </div>
            </div>
            <div className="bg-white p-8 aspect-[16/9] flex gap-10">
              <div className="w-48 flex flex-col gap-6">
                <div className="h-1 w-full bg-black/10"></div>
                <div className="h-1 w-3/4 bg-black/5"></div>
                <div className="h-1 w-5/6 bg-black/5"></div>
                <div className="mt-auto h-1 w-1/2 bg-black/5"></div>
              </div>
              <div className="flex-1 grid grid-cols-3 gap-6">
                <div className="col-span-2 border border-black/5 p-6 flex flex-col gap-6">
                  <div className="h-40 border border-black/10 relative overflow-hidden bg-zinc-50">
                    <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/5 to-transparent"></div>
                    {/* Minimalist line chart */}
                    <svg className="absolute inset-0 w-full h-full opacity-20" preserveAspectRatio="none" viewBox="0 0 100 100">
                      <path d="M0 80 L20 70 L40 75 L60 40 L80 45 L100 20" fill="none" stroke="black" strokeWidth="0.5"></path>
                    </svg>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="h-24 bg-zinc-100/50 border border-black/5"></div>
                    <div className="h-24 bg-zinc-100/50 border border-black/5"></div>
                  </div>
                </div>
                <div className="border border-black/5 p-6 flex flex-col gap-4">
                  <div className="h-3 w-1/2 bg-black/10"></div>
                  <div className="h-1 w-full bg-black/5"></div>
                  <div className="h-1 w-full bg-black/5"></div>
                  <div className="h-1 w-3/4 bg-black/5"></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <section className="py-24 border-y border-black/5 bg-zinc-50">
          <div className="max-w-7xl mx-auto px-8">
            <p className="text-center text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 mb-16">Trusted by Infrastructure Leaders</p>
            <div className="flex flex-wrap justify-center gap-12 md:gap-24 opacity-60 grayscale transition-all duration-700 hover:opacity-100">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-black text-xl">cloud_done</span>
                <span className="font-bold tracking-tighter text-xl text-black">HALCYON</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-black text-xl">ac_unit</span>
                <span className="font-bold tracking-tighter text-xl text-black">NORTHWIND</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-black text-xl">layers</span>
                <span className="font-bold tracking-tighter text-xl text-black">STACKHAUS</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-black text-xl">terminal</span>
                <span className="font-bold tracking-tighter text-xl text-black">PROXIMA</span>
              </div>
            </div>
          </div>
        </section>

        {/* Bento Features (Light Mode) */}
        <section className="py-40 px-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-px bg-black/5 border border-black/5">
            {/* Server Health */}
            <div className="md:col-span-3 bg-white p-10 hover:bg-zinc-50 transition-colors group">
              <div className="flex justify-between items-start mb-16">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 mb-2 block">Real-time Ops</span>
                  <h3 className="text-3xl font-normal font-headline italic text-black">Server Health</h3>
                </div>
                <span className="material-symbols-outlined text-zinc-300 group-hover:text-black transition-colors">monitoring</span>
              </div>
              <div className="space-y-10">
                <div>
                  <div className="flex justify-between text-[10px] mb-3 text-zinc-400 uppercase tracking-widest font-bold">
                    <span>US-EAST-1 (PROD)</span>
                    <span className="text-black">98% Load</span>
                  </div>
                  <div className="h-0.5 w-full bg-zinc-100">
                    <div className="h-full bg-black w-[98%] shadow-[0_0_10px_rgba(0,0,0,0.1)]"></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] mb-3 text-zinc-400 uppercase tracking-widest font-bold">
                    <span>EU-WEST-2 (STAGING)</span>
                    <span className="text-black">42% Load</span>
                  </div>
                  <div className="h-0.5 w-full bg-zinc-100">
                    <div className="h-full bg-zinc-400 w-[42%]"></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] mb-3 text-zinc-400 uppercase tracking-widest font-bold">
                    <span>ASIA-SOUTH-1 (DEV)</span>
                    <span className="text-zinc-300">12% Load</span>
                  </div>
                  <div className="h-0.5 w-full bg-zinc-100">
                    <div className="h-full bg-zinc-200 w-[12%]"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Provisioning */}
            <div className="md:col-span-3 lg:col-span-1 bg-white flex flex-col border-l border-black/5">
              <div className="p-10 border-b border-black/5">
                <h3 className="text-lg font-bold uppercase tracking-widest text-xs text-black">Provisioning</h3>
              </div>
              <div className="flex-1 bg-white p-6 font-mono text-[10px] leading-relaxed text-zinc-400 overflow-hidden">
                <div className="opacity-40">$ terraform apply</div>
                <div className="text-zinc-500">Plan: 12 to add, 0 to change</div>
                <div>aws_instance.web: Creating...</div>
                <div className="text-black">aws_instance.web: Creation complete</div>
                <div className="opacity-40">Output: public_ip = "54.21..."</div>
                <div className="animate-pulse bg-black w-1.5 h-3 inline-block align-middle"></div>
              </div>
            </div>

            {/* Billing MRR */}
            <div className="md:col-span-3 lg:col-span-2 bg-white p-10 border-l border-black/5">
              <div className="flex justify-between items-center mb-12">
                <h3 className="text-lg font-bold uppercase tracking-widest text-xs text-black">Billing Overview</h3>
                <span className="px-3 py-1 border border-black/20 text-black text-[9px] font-bold uppercase tracking-tighter">Live</span>
              </div>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-5xl font-normal font-headline text-black">$842.2k</span>
                <span className="text-zinc-400 text-xs font-bold">↑ 12.4%</span>
              </div>
              <p className="text-zinc-500 text-xs uppercase tracking-widest mb-12">Monthly Recurring Revenue</p>
              <div className="flex items-end gap-1 h-20">
                <div className="flex-1 bg-zinc-100 h-[40%]"></div>
                <div className="flex-1 bg-zinc-100 h-[55%]"></div>
                <div className="flex-1 bg-zinc-100 h-[45%]"></div>
                <div className="flex-1 bg-zinc-100 h-[70%]"></div>
                <div className="flex-1 bg-zinc-100 h-[60%]"></div>
                <div className="flex-1 bg-zinc-100 h-[85%]"></div>
                <div className="flex-1 bg-black h-full"></div>
              </div>
            </div>

            {/* Feature Mini Tiles */}
            <div className="md:col-span-2 bg-white p-10 border-t border-black/5 flex flex-col justify-center items-center text-center group hover:bg-zinc-50 transition-colors">
              <span className="material-symbols-outlined text-zinc-300 text-4xl mb-6 group-hover:text-black transition-colors" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
              <h4 className="text-xs font-bold uppercase tracking-widest mb-3 text-black">RBAC Control</h4>
              <p className="text-xs text-zinc-500 max-w-[180px] leading-relaxed">Enterprise-grade permissioning for teams of 50+.</p>
            </div>
            <div className="md:col-span-2 bg-white p-10 border-t border-l border-black/5 flex flex-col justify-center items-center text-center group hover:bg-zinc-50 transition-colors">
              <span className="material-symbols-outlined text-zinc-300 text-4xl mb-6 group-hover:text-black transition-colors" style={{ fontVariationSettings: "'FILL' 1" }}>api</span>
              <h4 className="text-xs font-bold uppercase tracking-widest mb-3 text-black">Native API</h4>
              <p className="text-xs text-zinc-500 max-w-[180px] leading-relaxed">Programmable hosting that scales with your code.</p>
            </div>
            <div className="md:col-span-2 bg-white p-10 border-t border-l border-black/5 flex flex-col justify-center items-center text-center group hover:bg-zinc-50 transition-colors">
              <span className="material-symbols-outlined text-zinc-300 text-4xl mb-6 group-hover:text-black transition-colors" style={{ fontVariationSettings: "'FILL' 1" }}>support_agent</span>
              <h4 className="text-xs font-bold uppercase tracking-widest mb-3 text-black">Unified Support</h4>
              <p className="text-xs text-zinc-500 max-w-[180px] leading-relaxed">Tickets and telemetry in a single view.</p>
            </div>
          </div>
        </section>

        {/* Developer Focus */}
        <section className="py-40 bg-zinc-50 border-y border-black/5">
          <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 md:grid-cols-2 gap-24 items-center">
            <div>
              <h2 className="text-5xl md:text-7xl font-headline italic mb-10 leading-tight text-black">Built for those who live in the terminal.</h2>
              <p className="text-zinc-600 text-lg leading-relaxed mb-12 font-light">
                WHMS isn't just a UI. It's a headless engine. Deploy clusters, manage secrets, and audit access logs directly from your CLI or CI/CD pipelines.
              </p>
              <ul className="space-y-6">
                <li className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-black text-lg">check</span>
                  <span className="text-black font-medium text-sm uppercase tracking-widest">Zero-config authentication</span>
                </li>
                <li className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-black text-lg">check</span>
                  <span className="text-black font-medium text-sm uppercase tracking-widest">JSON-standardized outputs</span>
                </li>
                <li className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-black text-lg">check</span>
                  <span className="text-black font-medium text-sm uppercase tracking-widest">Native GitHub Actions integration</span>
                </li>
              </ul>
            </div>
            <div className="bg-white monolith-border p-px shadow-sm">
              <div className="bg-white p-10 font-mono text-xs leading-8">
                <div className="flex gap-2 mb-10 opacity-30">
                  <div className="w-1.5 h-1.5 bg-black"></div>
                  <div className="w-1.5 h-1.5 bg-black"></div>
                  <div className="w-1.5 h-1.5 bg-black"></div>
                </div>
                <div className="space-y-1">
                  <div className="flex gap-4">
                    <span className="text-zinc-400">$</span>
                    <span className="text-black">whms accounts create \</span>
                  </div>
                  <div className="flex gap-4 ml-6">
                    <span className="text-zinc-500">--name "new-node-primary" \</span>
                  </div>
                  <div className="flex gap-4 ml-6">
                    <span className="text-zinc-500">--region "us-west-2" \</span>
                  </div>
                  <div className="flex gap-4 ml-6">
                    <span className="text-zinc-500">--plan "enterprise-managed"</span>
                  </div>
                  <div className="mt-8 text-black font-bold">
                    ✓ Account created successfully [ID: acc_8x92j]
                  </div>
                  <div className="text-zinc-400 mt-2 italic opacity-70">
                    Provisioning resources... 14%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonial (Light Mode) */}
        <section className="py-48 px-8 border-b border-black/5">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-16 flex justify-center">
              <div className="relative w-24 h-24 monolith-border p-1">
                <img className="w-full h-full object-cover grayscale" alt="professional portrait of Lena Mori" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDUYGxRanzaePkVlphRrA9b1jY8MeQhJ8v5g5Hh23nXJPp_a0lYFlHny5-q0FniWIi3q__RyEO7Qbe1l1adx703CTGUamlq4W9mabWCNBztYRaTPXjschDO7CUEp2Fa2fOzsQub6mOrUeZZzKeN6dP0eJ5AYegs6sIikeUbUWMFnRBJjxKqq7jbsn9rvl8JoAJuyOamOJm1ZGtwnUVz4yuBlbwuINsaQQcu21HonejpjKP2QxpfGj9261bdHoImLZjoe9AfyKHtPZtI"/>
              </div>
            </div>
            <blockquote className="text-4xl md:text-6xl font-headline italic leading-[1.1] mb-12 text-black">
              "WHMS turned our chaotic multi-tab ops workflow into a unified command plane. We've reduced our MTTR by 60%."
            </blockquote>
            <cite className="not-italic">
              <span className="block text-sm font-bold uppercase tracking-[0.3em] text-black mb-1">Lena Mori</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Head of Infra at Halcyon Cloud</span>
            </cite>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-48 px-8">
          <div className="max-w-6xl mx-auto monolith-border bg-white p-20 text-center relative overflow-hidden">
            <div className="absolute -top-32 -left-32 w-64 h-64 bg-black/5 rounded-full blur-[100px]"></div>
            <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-black/5 rounded-full blur-[100px]"></div>
            <h2 className="text-6xl md:text-8xl font-headline italic mb-10 relative z-10 leading-tight text-black">Stop switching tabs.</h2>
            <p className="text-zinc-600 text-lg max-w-xl mx-auto mb-16 relative z-10 font-light">
              Join the 400+ infrastructure teams who have reclaimed their focus and standardized their operations with WHMS.
            </p>
            <div className="flex flex-col md:flex-row justify-center items-center gap-6 relative z-10">
              <Link href="/register" className="bg-black text-white font-bold text-sm uppercase tracking-[0.2em] px-12 py-5 transition-transform hover:-translate-y-1 active:translate-y-0 w-full md:w-auto">
                Deploy your Command Plane
              </Link>
              <button className="bg-transparent text-black border border-black/20 font-bold text-sm uppercase tracking-[0.2em] px-12 py-5 hover:bg-black hover:text-white transition-all w-full md:w-auto">
                Request a Demo
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-20 px-8 border-t border-black/5 bg-white">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 max-w-7xl mx-auto font-sans text-[10px] uppercase tracking-[0.2em] text-zinc-500">
          <div className="col-span-2 md:col-span-1">
            <div className="font-headline text-3xl italic normal-case tracking-tight text-black mb-8">WHMS</div>
            <p className="normal-case tracking-normal text-zinc-500 leading-loose text-xs font-light">
              The command plane for prestige hosting operations. Engineered for teams that don't compromise.
            </p>
          </div>
          <div className="flex flex-col gap-5">
            <p className="text-black font-bold mb-4 tracking-[0.3em]">Product</p>
            <Link className="hover:text-black transition-colors" href="#">Platform</Link>
            <Link className="hover:text-black transition-colors" href="#">Console</Link>
            <Link className="hover:text-black transition-colors" href="#">Pricing</Link>
          </div>
          <div className="flex flex-col gap-5">
            <p className="text-black font-bold mb-4 tracking-[0.3em]">Resources</p>
            <Link className="hover:text-black transition-colors" href="#">Developers</Link>
            <Link className="hover:text-black transition-colors" href="#">Docs</Link>
            <Link className="hover:text-black transition-colors" href="#">Status</Link>
          </div>
          <div className="flex flex-col gap-5">
            <p className="text-black font-bold mb-4 tracking-[0.3em]">Legal</p>
            <Link className="hover:text-black transition-colors" href="#">Privacy</Link>
            <Link className="hover:text-black transition-colors" href="#">Terms</Link>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-24 pt-10 border-t border-black/5 text-center text-[9px] uppercase tracking-[0.4em] text-zinc-300">
          © 2024 WHMS COMMAND PLANE — MONOLITH EDITION
        </div>
      </footer>
    </div>
  );
}
