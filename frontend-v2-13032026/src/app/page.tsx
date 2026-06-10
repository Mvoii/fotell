// import Image from "next/image";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-base font-sans">
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 w-full border-b border-subtle bg-base/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔮</span>
            <span className="font-bold text-xl tracking-tight">FoTell</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/auth/login"
              className="text-sm font-medium hover:text-accent-blue transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/auth/register"
              className="text-sm font-medium bg-foreground text-background px-4 py-2 rounded-full hover:opacity-90 transition-opacity"
            >
              Sign Up &rarr;
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative w-full bg-base text-foreground py-24 md:py-32 overflow-hidden">
          {/* Subtle grid pattern background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>

          <div className="container mx-auto px-4 relative z-10 flex flex-col items-center text-center">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
              Predict the Future.<br />
              <span className="text-accent-blue">Trade What You Know.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10">
              Binary prediction markets powered by LSMR AMM.<br />
              Start with <span className="text-foreground font-semibold">5,000 KES</span> free play money.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-16">
              <Link
                href="/auth/register"
                className="bg-accent-blue hover:bg-accent-blue-hover text-white font-semibold px-8 py-3 rounded-full transition-colors flex items-center justify-center"
              >
                Get Started &mdash; Free
              </Link>
              <Link
                href="/markets"
                className="bg-transparent border border-subtle hover:bg-subtle text-foreground font-semibold px-8 py-3 rounded-full transition-colors flex items-center justify-center"
              >
                Browse Markets &rarr;
              </Link>
            </div>

            {/* Stats Strip */}
            <div className="grid grid-cols-3 gap-4 md:gap-8 max-w-3xl w-full border-t border-subtle pt-8">
              <div className="flex flex-col items-center">
                <span className="text-3xl md:text-4xl font-bold">142</span>
                <span className="text-sm text-muted-foreground uppercase tracking-wider mt-1">Markets</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-3xl md:text-4xl font-bold">KES 2.4M</span>
                <span className="text-sm text-muted-foreground uppercase tracking-wider mt-1">Volume</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-3xl md:text-4xl font-bold">98.7%</span>
                <span className="text-sm text-muted-foreground uppercase tracking-wider mt-1">Accuracy</span>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURED MARKETS */}
        <section className="py-20 bg-base">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-10 text-center">Featured Markets</h2>

            <div className="flex overflow-x-auto pb-8 -mx-4 px-4 snap-x snap-mandatory md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:pb-0 md:px-0 md:mx-0">
              {/* Market Card 1 */}
              <div className="min-w-[85vw] md:min-w-0 snap-center bg-surface border border-subtle rounded-2xl p-6 shadow-sm mr-4 md:mr-0 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-semibold px-2 py-1 bg-yes-dim text-yes-strong rounded">OPEN</span>
                </div>
                <h3 className="text-lg font-bold mb-6 line-clamp-2 flex-grow">Will BTC reach $100k by March?</h3>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-yes-strong w-8">YES</span>
                    <div className="flex-1 mx-3 h-2 bg-subtle rounded-full overflow-hidden">
                      <div className="h-full bg-yes-strong" style={{ width: "62%" }}></div>
                    </div>
                    <span className="font-medium w-8 text-right">62%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-no-strong w-8">NO</span>
                    <div className="flex-1 mx-3 h-2 bg-subtle rounded-full overflow-hidden">
                      <div className="h-full bg-no-strong" style={{ width: "38%" }}></div>
                    </div>
                    <span className="font-medium w-8 text-right">38%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-auto pt-4 border-t border-subtle">
                  <span className="text-sm text-muted-foreground">Vol: 45K KES</span>
                  <Link href="/markets/1" className="text-sm font-semibold text-accent-blue hover:text-accent-blue-hover">Trade Now</Link>
                </div>
              </div>

              {/* Market Card 2 */}
              <div className="min-w-[85vw] md:min-w-0 snap-center bg-surface border border-subtle rounded-2xl p-6 shadow-sm mr-4 md:mr-0 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-semibold px-2 py-1 bg-yes-dim text-yes-strong rounded">OPEN</span>
                </div>
                <h3 className="text-lg font-bold mb-6 line-clamp-2 flex-grow">Will Kenya 2026 GDP {">"} 6%?</h3>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-yes-strong w-8">YES</span>
                    <div className="flex-1 mx-3 h-2 bg-subtle rounded-full overflow-hidden">
                      <div className="h-full bg-yes-strong" style={{ width: "71%" }}></div>
                    </div>
                    <span className="font-medium w-8 text-right">71%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-no-strong w-8">NO</span>
                    <div className="flex-1 mx-3 h-2 bg-subtle rounded-full overflow-hidden">
                      <div className="h-full bg-no-strong" style={{ width: "29%" }}></div>
                    </div>
                    <span className="font-medium w-8 text-right">29%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-auto pt-4 border-t border-subtle">
                  <span className="text-sm text-muted-foreground">Vol: 120K KES</span>
                  <Link href="/markets/2" className="text-sm font-semibold text-accent-blue hover:text-accent-blue-hover">Trade Now</Link>
                </div>
              </div>

              {/* Market Card 3 */}
              <div className="min-w-[85vw] md:min-w-0 snap-center bg-surface border border-subtle rounded-2xl p-6 shadow-sm flex flex-col opacity-75">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-semibold px-2 py-1 bg-elevated text-muted-foreground rounded">CLOSED</span>
                </div>
                <h3 className="text-lg font-bold mb-6 line-clamp-2 flex-grow">Will Musk tweet about X today?</h3>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-yes-strong w-8">YES</span>
                    <div className="flex-1 mx-3 h-2 bg-subtle rounded-full overflow-hidden">
                      <div className="h-full bg-yes-strong" style={{ width: "88%" }}></div>
                    </div>
                    <span className="font-medium w-8 text-right">88%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-no-strong w-8">NO</span>
                    <div className="flex-1 mx-3 h-2 bg-subtle rounded-full overflow-hidden">
                      <div className="h-full bg-no-strong" style={{ width: "12%" }}></div>
                    </div>
                    <span className="font-medium w-8 text-right">12%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-auto pt-4 border-t border-subtle">
                  <span className="text-sm text-muted-foreground">Vol: 8K KES</span>
                  <Link href="/markets/3" className="text-sm font-semibold text-muted-foreground hover:text-foreground">View Result</Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="py-24 bg-surface border-t border-subtle">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-16 text-center">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-12 text-center max-w-5xl mx-auto">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-accent-blue-dim text-accent-blue rounded-2xl flex items-center justify-center text-2xl font-bold mb-6">1</div>
                <h3 className="text-xl font-bold mb-3">Register</h3>
                <p className="text-muted-foreground">Get 5K KES free play money instantly to start predicting.</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-accent-blue-dim text-accent-blue rounded-2xl flex items-center justify-center text-2xl font-bold mb-6">2</div>
                <h3 className="text-xl font-bold mb-3">Browse Markets</h3>
                <p className="text-muted-foreground">Find events you know about, across politics, crypto, pop culture and more.</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-accent-blue-dim text-accent-blue rounded-2xl flex items-center justify-center text-2xl font-bold mb-6">3</div>
                <h3 className="text-xl font-bold mb-3">Trade & Win</h3>
                <p className="text-muted-foreground">Buy YES/NO shares, earn payout when you make correct calls.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-subtle bg-base py-8">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between text-sm text-muted-foreground">
          <p>FoTell &copy; 2026</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <Link href="/markets" className="hover:text-foreground transition-colors">Markets</Link>
            <Link href="/api-docs" className="hover:text-foreground transition-colors">API Docs</Link>
            <a href="https://github.com/esiepe/fotell" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">GitHub</a>
            <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
