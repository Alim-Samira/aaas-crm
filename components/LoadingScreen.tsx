'use client';
// components/LoadingScreen.tsx
// ─────────────────────────────────────────────────────────────
// Cinematic full-screen loader with "AAAS" monogram animation.
// Usage: <LoadingScreen /> or <LoadingScreen label="Chargement..." />
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';

interface LoadingScreenProps {
  label?: string;
  fullScreen?: boolean; // false = inline loader (for page sections)
}

export default function LoadingScreen({
  label,
  fullScreen = true,
}: LoadingScreenProps) {
  const [phase, setPhase] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    // Phase 0 → 1: letters assemble (400ms)
    const t1 = setTimeout(() => setPhase(1), 400);
    // Phase 1 → 2: glow + pulse (900ms)
    const t2 = setTimeout(() => setPhase(2), 900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const letters = ['A', 'A', 'A', 'S'];

  const containerClass = fullScreen
    ? 'fixed inset-0 z-[200] flex flex-col items-center justify-center'
    : 'flex flex-col items-center justify-center min-h-[320px]';

  return (
    <div className={containerClass} style={{ background: fullScreen ? '#080d1a' : 'transparent' }}>

      {/* Radial glow behind letters */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 400,
          height: 400,
          background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)',
          filter: 'blur(40px)',
          transition: 'opacity 0.6s ease',
          opacity: phase >= 1 ? 1 : 0,
        }}
      />

      {/* AAAS monogram */}
      <div className="relative flex items-end gap-1 mb-10" aria-label="AAAS">
        {letters.map((letter, i) => (
          <span
            key={i}
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 'clamp(52px, 10vw, 96px)',
              fontWeight: 900,
              fontStyle: 'italic',
              lineHeight: 1,
              letterSpacing: '-0.04em',
              display: 'inline-block',
              color: phase >= 1 ? '#ffffff' : 'transparent',
              textShadow: phase >= 2
                ? `0 0 40px rgba(99,102,241,0.8), 0 0 80px rgba(139,92,246,0.4)`
                : 'none',
              transform: phase >= 1
                ? 'translateY(0) scale(1)'
                : `translateY(${24 + i * 6}px) scale(0.85)`,
              opacity: phase >= 1 ? 1 : 0,
              transition: `
                transform 0.55s cubic-bezier(0.34,1.56,0.64,1) ${i * 70}ms,
                opacity   0.4s ease ${i * 70}ms,
                color     0.3s ease ${i * 70}ms,
                text-shadow 0.5s ease ${300 + i * 60}ms
              `,
            }}
          >
            {letter}
          </span>
        ))}

        {/* Accent dot */}
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'inline-block',
            marginBottom: 14,
            marginLeft: 4,
            boxShadow: phase >= 2 ? '0 0 16px rgba(99,102,241,0.9)' : 'none',
            transform: phase >= 1 ? 'scale(1)' : 'scale(0)',
            opacity: phase >= 1 ? 1 : 0,
            transition: `transform 0.4s cubic-bezier(0.34,1.56,0.64,1) 320ms,
                         opacity 0.3s ease 320ms,
                         box-shadow 0.5s ease 600ms`,
          }}
        />
      </div>

      {/* Animated progress bar */}
      <div
        style={{
          width: 200,
          height: 2,
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 999,
          overflow: 'hidden',
          opacity: phase >= 1 ? 1 : 0,
          transition: 'opacity 0.4s ease 300ms',
        }}
      >
        <div
          style={{
            height: '100%',
            borderRadius: 999,
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4)',
            backgroundSize: '200% 100%',
            animation: phase >= 1 ? 'shimmerBar 1.4s ease-in-out infinite' : 'none',
          }}
        />
      </div>

      {/* Label */}
      {label && (
        <p
          style={{
            marginTop: 20,
            fontSize: 13,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(148,163,184,0.6)',
            fontFamily: "'DM Sans', sans-serif",
            opacity: phase >= 2 ? 1 : 0,
            transition: 'opacity 0.4s ease 600ms',
          }}
        >
          {label}
        </p>
      )}

      {/* Floating orbs */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width:  [80, 50, 120][i],
            height: [80, 50, 120][i],
            left:   ['15%', '75%', '60%'][i],
            top:    ['30%', '20%', '65%'][i],
            background: [
              'rgba(99,102,241,0.12)',
              'rgba(139,92,246,0.10)',
              'rgba(6,182,212,0.08)',
            ][i],
            filter: 'blur(30px)',
            opacity: phase >= 1 ? 1 : 0,
            transition: `opacity 0.8s ease ${200 + i * 150}ms`,
            animation: `floatOrb${i} ${[6, 8, 7][i]}s ease-in-out infinite`,
          }}
        />
      ))}

      <style>{`
        @keyframes shimmerBar {
          0%   { background-position: 200% 0; width: 0%; }
          40%  { background-position: 100% 0; width: 70%; }
          100% { background-position: 0% 0;   width: 100%; }
        }
        @keyframes floatOrb0 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%     { transform: translate(12px,-18px) scale(1.08); }
        }
        @keyframes floatOrb1 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%     { transform: translate(-10px,14px) scale(0.94); }
        }
        @keyframes floatOrb2 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%     { transform: translate(8px,-10px) scale(1.04); }
        }
      `}</style>
    </div>
  );
}

// ── Inline variant (for page-level loading) ────────────────
export function PageLoader({ label }: { label?: string }) {
  return <LoadingScreen label={label ?? 'Chargement...'} fullScreen={false} />;
}
