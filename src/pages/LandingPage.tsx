import { Link } from "react-router-dom";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-on-background">
      {/* NAV */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur border-b border-outline-variant/40 header-blur">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-primary text-3xl">monitor_heart</span>
            <span className="font-headline-lg font-bold text-xl">Local<span className="text-primary">Pulse</span></span>
          </div>
          <nav className="hidden md:flex items-center gap-9 font-medium text-sm text-on-surface-variant">
            <a className="hover:text-primary transition-colors" href="#nearby">Nearby Right Now</a>
            <a className="hover:text-primary transition-colors" href="#help">Verified Help</a>
            <a className="hover:text-primary transition-colors" href="#needs">Need It Now</a>
            <a className="hover:text-primary transition-colors" href="#how">How It Works</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden sm:block text-sm font-semibold text-on-surface px-4 py-2.5 rounded-full hover:bg-surface-container transition-colors">
              Log in
            </Link>
            <Link to="/signup" className="bg-primary text-on-primary text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-primary-container transition-colors shadow-sm btn-press">
              Find your area
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-outline-variant/40 animate-fade-in">
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(#c2c8bf 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
        <div className="relative max-w-7xl mx-auto px-6 lg:px-10 pt-20 pb-24 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="inline-flex items-center gap-2 bg-secondary-container/50 text-on-secondary-container text-xs font-bold uppercase tracking-wide px-3.5 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary" /> Live in 40+ localities across Gujarat
            </span>
            <h1 className="font-headline-xl font-extrabold text-5xl lg:text-6xl leading-[1.05] tracking-tight text-on-surface">
              Know what's<br /> happening <span className="text-primary">next door.</span>
            </h1>
            <p className="mt-6 text-lg text-on-surface-variant max-w-md leading-relaxed">
              Real alerts, trusted help, and neighborly favors — all from people who actually live on your street. No noise, just your locality.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link to="/signup" className="bg-primary text-on-primary font-semibold px-7 py-3.5 rounded-full hover:bg-primary-container transition-colors shadow-md btn-press">
                Join your neighborhood
              </Link>
              <Link to="/login" className="flex items-center gap-2 font-semibold text-on-surface px-5 py-3.5 rounded-full border border-outline-variant hover:bg-surface-container-low transition-colors btn-press">
                <span className="material-symbols-outlined">play_circle</span> See it in action
              </Link>
            </div>
            <div className="mt-10 flex items-center gap-6 text-sm text-on-surface-variant">
              <div className="flex -space-x-2.5">
                <div className="w-9 h-9 rounded-full bg-primary-container border-2 border-background" />
                <div className="w-9 h-9 rounded-full bg-secondary-container border-2 border-background" />
                <div className="w-9 h-9 rounded-full bg-surface-container-high border-2 border-background" />
              </div>
              <p><span className="font-bold text-on-surface">12,400+</span> neighbors already connected</p>
            </div>
          </div>

          {/* hero mockup card stack */}
          <div className="relative h-[440px] hidden lg:block">
            <div className="absolute top-0 right-6 w-80 bg-white rounded-2xl border border-outline-variant/60 shadow-xl p-5 rotate-2">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wide bg-secondary/10 text-secondary px-2.5 py-1 rounded-full">Urgent</span>
                <span className="text-xs text-on-surface-variant">10 min ago</span>
              </div>
              <p className="font-headline-lg font-bold text-lg leading-snug">Water Supply Disruption</p>
              <p className="text-sm text-on-surface-variant mt-1.5">Emergency pipeline repair near Carter Road. Supply cut for 4 hours.</p>
            </div>
            <div className="absolute top-44 left-2 w-80 bg-white rounded-2xl border border-outline-variant/60 shadow-xl p-5 -rotate-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-primary-container" />
                <p className="font-semibold text-sm">Meera Aunty <span className="text-primary">✓</span></p>
              </div>
              <p className="font-headline-lg font-bold text-lg leading-snug">Excellent North Indian Cook</p>
              <p className="text-sm text-on-surface-variant mt-1.5">Verified by 12 neighbors · Pali Hill</p>
            </div>
            <div className="absolute bottom-0 right-10 w-72 bg-white rounded-2xl border border-outline-variant/60 shadow-xl p-5 rotate-1">
              <span className="text-xs font-bold uppercase tracking-wide bg-primary/10 text-primary px-2.5 py-1 rounded-full">Need to Borrow</span>
              <p className="font-headline-lg font-bold text-lg leading-snug mt-3">Tall Ladder for 1 hour</p>
              <p className="text-sm text-on-surface-variant mt-1.5">350m away · Perry Cross Rd</p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 py-24">
        <div className="max-w-2xl mb-16">
          <h2 className="font-headline-lg font-bold text-4xl tracking-tight">Three ways to feel closer to where you live</h2>
          <p className="mt-4 text-on-surface-variant text-lg">Every feature is built around one idea — hyperlocal, real, and walking-distance close.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <div id="nearby" className="bg-surface-container-low rounded-2xl p-8 border border-outline-variant/40 hover-lift animate-card-stagger" style={{ animationDelay: "0.1s" }}>
            <div className="w-12 h-12 rounded-full bg-secondary/15 flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-secondary">bolt</span>
            </div>
            <h3 className="font-headline-lg font-bold text-xl mb-2.5">Nearby Right Now</h3>
            <p className="text-on-surface-variant leading-relaxed mb-5">"Auto strike near the station." "Water supply down again." Real-time updates from real locals, gone once they're no longer relevant.</p>
            <Link to="/login" className="font-semibold text-primary text-sm inline-flex items-center gap-1 hover:gap-2 transition-all">
              Open live feed <span className="material-symbols-outlined text-base">arrow_forward</span>
            </Link>
          </div>
          <div id="help" className="bg-surface-container-low rounded-2xl p-8 border border-outline-variant/40 hover-lift animate-card-stagger" style={{ animationDelay: "0.2s" }}>
            <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-primary">verified</span>
            </div>
            <h3 className="font-headline-lg font-bold text-xl mb-2.5">Verified Help</h3>
            <p className="text-on-surface-variant leading-relaxed mb-5">Need a cook, maid, tutor, plumber? See who your actual neighbors trust — verified by real bookings, not paid reviews.</p>
            <Link to="/login" className="font-semibold text-primary text-sm inline-flex items-center gap-1 hover:gap-2 transition-all">
              Browse directory <span className="material-symbols-outlined text-base">arrow_forward</span>
            </Link>
          </div>
          <div id="needs" className="bg-surface-container-low rounded-2xl p-8 border border-outline-variant/40 hover-lift animate-card-stagger" style={{ animationDelay: "0.3s" }}>
            <div className="w-12 h-12 rounded-full bg-tertiary/15 flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-tertiary">handshake</span>
            </div>
            <h3 className="font-headline-lg font-bold text-xl mb-2.5">Need It Now</h3>
            <p className="text-on-surface-variant leading-relaxed mb-5">Borrow a drill, share a ride to the airport, find a spare ticket. Most replies come from walking distance away.</p>
            <Link to="/login" className="font-semibold text-primary text-sm inline-flex items-center gap-1 hover:gap-2 transition-all">
              See requests <span className="material-symbols-outlined text-base">arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="bg-surface-container-low border-y border-outline-variant/40">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-24 grid lg:grid-cols-3 gap-12">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-secondary mb-3">Step 1</p>
            <h3 className="font-headline-lg font-bold text-2xl mb-3">Confirm your locality</h3>
            <p className="text-on-surface-variant leading-relaxed">Verify your address or society once — this keeps every post genuinely hyperlocal, not a citywide feed in disguise.</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-secondary mb-3">Step 2</p>
            <h3 className="font-headline-lg font-bold text-2xl mb-3">See what's close</h3>
            <p className="text-on-surface-variant leading-relaxed">Alerts, help, and requests are ranked by distance and time — not by an algorithm trying to keep you scrolling.</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-secondary mb-3">Step 3</p>
            <h3 className="font-headline-lg font-bold text-2xl mb-3">Give and get help</h3>
            <p className="text-on-surface-variant leading-relaxed">Reply, lend, recommend, or ask — every interaction builds your trust score with the neighbors around you.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 py-24 text-center">
        <h2 className="font-headline-lg font-bold text-4xl tracking-tight max-w-xl mx-auto">
          Your street already has a conversation happening. Come join it.
        </h2>
        <Link to="/signup" className="mt-8 inline-block bg-primary text-on-primary font-semibold px-8 py-4 rounded-full hover:bg-primary-container transition-colors shadow-md btn-press">
          Find your neighborhood
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-outline-variant/40 bg-surface-container-low">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-14 grid md:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-primary text-2xl">monitor_heart</span>
              <span className="font-headline-lg font-bold">Padosi</span>
            </div>
            <p className="text-sm text-on-surface-variant">Built for neighborhoods, not newsfeeds.</p>
          </div>
          <div>
            <p className="font-semibold text-sm mb-4">Product</p>
            <ul className="space-y-2.5 text-sm text-on-surface-variant">
              <li><a className="hover:text-primary" href="#nearby">Nearby Right Now</a></li>
              <li><a className="hover:text-primary" href="#help">Verified Help</a></li>
              <li><a className="hover:text-primary" href="#needs">Need It Now</a></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-sm mb-4">Company</p>
            <ul className="space-y-2.5 text-sm text-on-surface-variant">
              <li><a className="hover:text-primary" href="#">About</a></li>
              <li><a className="hover:text-primary" href="#">Trust & Safety</a></li>
              <li><a className="hover:text-primary" href="#">Contact</a></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-sm mb-4">Legal</p>
            <ul className="space-y-2.5 text-sm text-on-surface-variant">
              <li><a className="hover:text-primary" href="#">Privacy</a></li>
              <li><a className="hover:text-primary" href="#">Terms</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-outline-variant/40 py-6 text-center text-xs text-on-surface-variant">
          © 2026 Padosi. Made for your street.
        </div>
      </footer>
    </div>
  );
}
