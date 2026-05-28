'use client';

import './globals.css';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const navItems = [
  { href: '/', label: 'Overview' },
  { href: '/standings', label: 'Standings' },
  { href: '/players', label: 'Batters' },
  { href: '/undrafted', label: 'Wire' },
  { href: '/draft', label: 'Draft' },
];

const teamNames = ['Cole', 'Markus', 'J Mill', 'Ryan', 'Joey', 'Jack', 'Austin', 'Bobby'];

const MLB_NAVY = '#041E42';
const MLB_RED = '#C8102E';

function BaseballBatLogo() {
  return (
    /*
      Two crossed bats + baseball, matching the classic logo style.
      viewBox 0 0 44 44 → rendered 36×36px.

      Geometry:
        Bat axes cross at (22, 26).
        Bat 1: handle lower-left (5,42)  → barrel upper-right (42,5)
        Bat 2: handle lower-right (39,42) → barrel upper-left (2,5)
        Ball: cx=22 cy=17 r=10, sitting above the crossing point.

      The barrel ends flare past the ball on each side so they read clearly.
    */
    <svg width="36" height="36" viewBox="0 0 44 44" fill="none" aria-hidden="true">

      {/* ── Bat 1 (lower-left handle → upper-right barrel) ── */}
      {/* Knob circle at handle tip */}
      <circle cx="5" cy="42" r="3" fill="#A67C3A" />
      {/* Tapered body: handle width ≈3px, barrel width ≈8px */}
      <polygon points="4,41 7,43 43,9 38,3" fill="#D4A853" />

      {/* ── Bat 2 (lower-right handle → upper-left barrel) ── */}
      <circle cx="39" cy="42" r="3" fill="#A67C3A" />
      <polygon points="40,41 37,43 1,9 6,3" fill="#D4A853" />

      {/* ── Baseball — sits above crossing point, barrels flare out each side ── */}
      <circle cx="22" cy="17" r="11" fill="white" />

      {/* Bold stitching arcs */}
      <path d="M15.5 13 Q18 17 15.5 21"
        stroke="#C8102E" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M28.5 13 Q26 17 28.5 21"
        stroke="#C8102E" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* Cross-stitches left */}
      <line x1="15.5" y1="14.5" x2="18.5" y2="14"  stroke="#C8102E" strokeWidth="1.1" strokeLinecap="round" />
      <line x1="15.5" y1="17"   x2="18.5" y2="17"   stroke="#C8102E" strokeWidth="1.1" strokeLinecap="round" />
      <line x1="15.5" y1="19.5" x2="18.5" y2="20"   stroke="#C8102E" strokeWidth="1.1" strokeLinecap="round" />
      {/* Cross-stitches right */}
      <line x1="25.5" y1="14"   x2="28.5" y2="14.5" stroke="#C8102E" strokeWidth="1.1" strokeLinecap="round" />
      <line x1="25.5" y1="17"   x2="28.5" y2="17"   stroke="#C8102E" strokeWidth="1.1" strokeLinecap="round" />
      <line x1="25.5" y1="20"   x2="28.5" y2="19.5" stroke="#C8102E" strokeWidth="1.1" strokeLinecap="round" />

      <circle cx="22" cy="17" r="11" stroke="#ddd" strokeWidth="0.5" fill="none" />
    </svg>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    const onClick = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <header
          ref={headerRef}
          className="sticky top-0 z-50 shadow-md"
          style={{ backgroundColor: MLB_NAVY }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            {/* Top bar */}
            <div className="flex items-center justify-between h-14">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2.5 min-h-[44px]">
                <BaseballBatLogo />
                <div className="hidden sm:block">
                  <span className="text-white font-bold text-base tracking-tight">
                    Fantasy Baseball
                  </span>
                  <span className="font-black text-base ml-1.5" style={{ color: MLB_RED }}>
                    &apos;26
                  </span>
                </div>
              </Link>

              {/* Desktop nav */}
              <nav className="hidden md:flex items-center gap-0.5">
                {navItems.map(({ href, label }) => {
                  const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
                      style={{
                        color: active ? 'white' : '#93b4d4',
                        backgroundColor: active ? 'rgba(255,255,255,0.15)' : 'transparent',
                      }}
                      onMouseEnter={e => {
                        if (!active) (e.currentTarget as HTMLElement).style.color = 'white';
                      }}
                      onMouseLeave={e => {
                        if (!active) (e.currentTarget as HTMLElement).style.color = '#93b4d4';
                      }}
                    >
                      {label}
                    </Link>
                  );
                })}

                <div className="ml-2 pl-2 flex items-center gap-0.5" style={{ borderLeft: '1px solid rgba(255,255,255,0.2)' }}>
                  {teamNames.map((name, i) => {
                    const active = pathname === `/teams/${i + 1}`;
                    return (
                      <Link
                        key={i}
                        href={`/teams/${i + 1}`}
                        className="px-2 py-1 text-[11px] rounded font-semibold transition-colors"
                        style={{
                          color: active ? 'white' : '#93b4d4',
                          backgroundColor: active ? MLB_RED : 'transparent',
                        }}
                      >
                        {name}
                      </Link>
                    );
                  })}
                </div>
              </nav>

              {/* Mobile hamburger */}
              <button
                className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center"
                style={{ color: '#93b4d4' }}
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Toggle menu"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {menuOpen ? (
                    <path d="M18 6L6 18M6 6l12 12" />
                  ) : (
                    <path d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>

            {/* Mobile nav dropdown */}
            {menuOpen && (
              <div
                className="md:hidden pb-4 pt-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200"
                style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}
              >
                <div className="flex gap-1.5 flex-wrap">
                  {navItems.map(({ href, label }) => {
                    const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setMenuOpen(false)}
                        className="min-h-[40px] px-4 py-2 text-sm rounded-md flex items-center font-medium"
                        style={{
                          color: active ? 'white' : '#93b4d4',
                          backgroundColor: active ? 'rgba(255,255,255,0.15)' : 'transparent',
                        }}
                      >
                        {label}
                      </Link>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {teamNames.map((name, i) => {
                    const active = pathname === `/teams/${i + 1}`;
                    return (
                      <Link
                        key={i}
                        href={`/teams/${i + 1}`}
                        onClick={() => setMenuOpen(false)}
                        className="min-h-[40px] px-3.5 py-2 text-sm rounded flex items-center font-semibold"
                        style={{
                          color: active ? 'white' : '#93b4d4',
                          backgroundColor: active ? MLB_RED : 'transparent',
                        }}
                      >
                        {name}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div key={pathname} className="animate-in fade-in slide-in-from-bottom-1 duration-300">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
