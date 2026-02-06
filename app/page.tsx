'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

// ============================================
// DOTTED SURFACE COMPONENT (3D Background)
// ============================================
function DottedSurface() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const SEPARATION = 120;
    const AMOUNTX = 50;
    const AMOUNTY = 50;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.set(0, 400, 1000);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    containerRef.current.appendChild(renderer.domElement);

    const positions: number[] = [];
    const colors: number[] = [];
    const geometry = new THREE.BufferGeometry();

    for (let ix = 0; ix < AMOUNTX; ix++) {
      for (let iy = 0; iy < AMOUNTY; iy++) {
        positions.push(ix * SEPARATION - (AMOUNTX * SEPARATION) / 2, 0, iy * SEPARATION - (AMOUNTY * SEPARATION) / 2);
        colors.push(1, 1, 1);
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({ size: 5, vertexColors: true, transparent: true, opacity: 0.5, sizeAttenuation: true });
    const points = new THREE.Points(geometry, material);
    scene.add(points);

    let count = 0;
    let animationId: number;

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const positionsArray = geometry.attributes.position.array as Float32Array;
      let i = 0;
      for (let ix = 0; ix < AMOUNTX; ix++) {
        for (let iy = 0; iy < AMOUNTY; iy++) {
          positionsArray[i * 3 + 1] = Math.sin((ix + count) * 0.3) * 50 + Math.sin((iy + count) * 0.5) * 50;
          i++;
        }
      }
      geometry.attributes.position.needsUpdate = true;
      renderer.render(scene, camera);
      count += 0.05;
    };

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}
    />
  );
}

// ============================================
// ICONS
// ============================================
const Icons = {
  github: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 20, height: 20 }}>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  ),
  external: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
    </svg>
  ),
  check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ width: 16, height: 16 }}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
  rail: () => (
    <svg viewBox="0 0 40 40" fill="currentColor" style={{ width: 32, height: 32 }}>
      <rect x="8" y="4" width="3" height="32" rx="1" />
      <rect x="29" y="4" width="3" height="32" rx="1" />
      <rect x="6" y="8" width="7" height="2" />
      <rect x="6" y="14" width="7" height="2" />
      <rect x="6" y="20" width="7" height="2" />
      <rect x="6" y="26" width="7" height="2" />
      <rect x="6" y="32" width="7" height="2" />
      <rect x="27" y="8" width="7" height="2" />
      <rect x="27" y="14" width="7" height="2" />
      <rect x="27" y="20" width="7" height="2" />
      <rect x="27" y="26" width="7" height="2" />
      <rect x="27" y="32" width="7" height="2" />
      <circle cx="20" cy="20" r="7" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path d="M17 20l2 2 4-4" strokeWidth="2" stroke="currentColor" fill="none" />
    </svg>
  ),
  shield: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 24, height: 24 }}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  users: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 24, height: 24 }}>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  cpu: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 24, height: 24 }}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" />
    </svg>
  ),
  file: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 24, height: 24 }}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  ),
  card: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 24, height: 24 }}>
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <path d="M1 10h22" />
    </svg>
  ),
  checkCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 24, height: 24 }}>
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <path d="M22 4L12 14.01l-3-3" />
    </svg>
  ),
  arrowRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  ),
  layers: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 24, height: 24 }}>
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  ),
  lock: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 24, height: 24 }}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  ),
  eye: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 24, height: 24 }}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  flag: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 20, height: 20 }}>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7" />
    </svg>
  ),
};

// ============================================
// MAIN LANDING PAGE
// ============================================
export default function HumanRailLanding() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', overflowX: 'hidden' }}>
      <DottedSurface />

      {/* Gradient Overlays */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1 }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0.9) 100%)' }} />
        <div style={{ position: 'absolute', top: '-200px', left: '50%', transform: 'translateX(-50%)', width: '800px', height: '600px', background: 'radial-gradient(ellipse, rgba(16, 185, 129, 0.12) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 10 }}>

        {/* ═══════════════════════════════════════════ */}
        {/* HERO                                       */}
        {/* ═══════════════════════════════════════════ */}
        <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '0 1.5rem' }}>
          {/* Nav */}
          <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: '#fff' }}>
              <Icons.rail />
              <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>HumanRail</span>
            </a>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <a href="https://github.com/humanrail-labs/human-rail" target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
                <Icons.github /><span>GitHub</span>
              </a>
              <a href="/dashboard" style={{ padding: '0.625rem 1.25rem', backgroundColor: '#fff', color: '#000', fontWeight: 600, borderRadius: '9999px', textDecoration: 'none' }}>
                Launch App
              </a>
            </div>
          </div>

          {/* Hero content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', paddingBottom: '4rem' }}>
            <div style={{ maxWidth: '900px' }}>
              {/* Badge */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '9999px', marginBottom: '2rem' }}>
                <span style={{ width: '8px', height: '8px', backgroundColor: '#22c55e', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
                <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>Live on Solana Devnet</span>
              </div>

              <h1 style={{ fontSize: 'clamp(2.5rem, 8vw, 4.5rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
                Identity Rails for<br />
                <span style={{ background: 'linear-gradient(90deg, #34d399, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  AI Agents
                </span>
              </h1>

              <p style={{ fontSize: 'clamp(1.125rem, 3vw, 1.375rem)', color: 'rgba(255,255,255,0.55)', maxWidth: '620px', margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
                An open protocol for verified human identity, delegated agent authority, 
                and full on-chain auditability. Built on Solana.
              </p>

              {/* CTA */}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '4rem' }}>
                <a href="/dashboard" style={{ padding: '0.875rem 2rem', backgroundColor: '#fff', color: '#000', fontWeight: 700, borderRadius: '9999px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Open Dashboard <Icons.external />
                </a>
                <a href="https://github.com/humanrail-labs/human-rail" target="_blank" rel="noopener noreferrer"
                  style={{ padding: '0.875rem 2rem', backgroundColor: 'transparent', color: '#fff', fontWeight: 600, borderRadius: '9999px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(255,255,255,0.15)' }}>
                  <Icons.github /> View Source
                </a>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', maxWidth: '700px', margin: '0 auto' }}>
                {[
                  { value: '7', label: 'Programs Deployed' },
                  { value: '4', label: 'Protocol Layers' },
                  { value: '100%', label: 'Open Source' },
                  { value: 'Solana', label: 'Network' },
                ].map((stat, i) => (
                  <div key={i} style={{ padding: '1.25rem', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '1rem' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>{stat.value}</div>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════ */}
        {/* VISION                                     */}
        {/* ═══════════════════════════════════════════ */}
        <section style={{ padding: '8rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: 'clamp(2rem, 5vw, 2.75rem)', fontWeight: 700, marginBottom: '1.5rem', color: '#fff' }}>
              Why HumanRail?
            </h2>
            <p style={{ fontSize: '1.125rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.8, maxWidth: '700px', margin: '0 auto 3.5rem' }}>
              As AI agents become more autonomous, the question shifts from "what can they do?" to "who authorized them and can we verify it?" HumanRail provides the missing trust layer — a protocol where every agent traces back to a verified human, every action is bounded by explicit capabilities, and every transaction leaves an immutable receipt.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', textAlign: 'left' }}>
              {[
                { icon: <Icons.users />, title: 'Human-First', desc: 'Every agent is anchored to a verified human identity. No anonymous bots. Full accountability chain.' },
                { icon: <Icons.lock />, title: 'Bounded Authority', desc: 'Capabilities define exactly what an agent can do — spending limits, program scopes, time windows, and risk tiers.' },
                { icon: <Icons.eye />, title: 'Full Auditability', desc: 'Every action produces an on-chain receipt. Compliance-ready audit trails from day one.' },
              ].map((item, i) => (
                <div key={i} style={{ padding: '1.75rem', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '1rem' }}>
                  <div style={{ width: '44px', height: '44px', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.15)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: '#34d399' }}>
                    {item.icon}
                  </div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem', color: '#fff' }}>{item.title}</h3>
                  <p style={{ color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, fontSize: '0.925rem' }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════ */}
        {/* PROTOCOL STACK                             */}
        {/* ═══════════════════════════════════════════ */}
        <section style={{ padding: '8rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
              <h2 style={{ fontSize: 'clamp(2rem, 5vw, 2.75rem)', fontWeight: 700, marginBottom: '1rem', color: '#fff' }}>
                Protocol Architecture
              </h2>
              <p style={{ fontSize: '1.125rem', color: 'rgba(255,255,255,0.45)' }}>
                Four layers. Seven programs. One unified trust stack.
              </p>
            </div>

            {/* Layer diagram */}
            <div style={{ maxWidth: '800px', margin: '0 auto 4rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { layer: 'Audit Layer', programs: 'Receipts · Compliance Trail', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.15)' },
                { layer: 'Rails Layer', programs: 'HumanPay · DataBlink · Documents', color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.08)', border: 'rgba(167, 139, 250, 0.15)' },
                { layer: 'Authorization Layer', programs: 'Delegation · Capabilities · Freeze', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.08)', border: 'rgba(96, 165, 250, 0.15)' },
                { layer: 'Identity Layer', programs: 'Human Registry · Agent Registry', color: '#34d399', bg: 'rgba(52, 211, 153, 0.08)', border: 'rgba(52, 211, 153, 0.15)' },
              ].map((l, i) => (
                <div key={i} style={{ padding: '1.25rem 1.75rem', backgroundColor: l.bg, border: `1px solid ${l.border}`, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '3px', height: '28px', backgroundColor: l.color, borderRadius: '4px' }} />
                    <span style={{ fontWeight: 700, color: l.color, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{l.layer}</span>
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.9rem' }}>{l.programs}</span>
                </div>
              ))}
            </div>

            {/* Program cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
              {[
                { icon: <Icons.users />, title: 'Human Registry', desc: 'Verified human profiles with attestation-based trust scoring and third-party identity proofs.' },
                { icon: <Icons.cpu />, title: 'Agent Registry', desc: 'AI agent profiles linked to human principals with key rotation, TEE verification, and lifecycle management.' },
                { icon: <Icons.shield />, title: 'Delegation', desc: 'Capability tokens with per-transaction limits, daily caps, program scopes, risk tiers, and emergency freeze.' },
                { icon: <Icons.card />, title: 'HumanPay', desc: 'PDA-controlled escrow payments with invoice creation, capability-checked authorization, and dispute resolution.' },
                { icon: <Icons.file />, title: 'Document Registry', desc: 'On-chain document signing with hash-based verification and multi-signer attestation support.' },
                { icon: <Icons.checkCircle />, title: 'Receipts & DataBlink', desc: 'Immutable action logs for every protocol interaction. Full audit trail for compliance and analytics.' },
              ].map((feature, i) => (
                <div key={i} style={{ padding: '1.5rem', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '1rem' }}>
                  <div style={{ width: '44px', height: '44px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: 'rgba(255,255,255,0.7)' }}>
                    {feature.icon}
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem', color: '#fff' }}>{feature.title}</h3>
                  <p style={{ color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, fontSize: '0.9rem' }}>{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════ */}
        {/* ROADMAP                                    */}
        {/* ═══════════════════════════════════════════ */}
        <section style={{ padding: '8rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
              <h2 style={{ fontSize: 'clamp(2rem, 5vw, 2.75rem)', fontWeight: 700, marginBottom: '1rem', color: '#fff' }}>
                Roadmap
              </h2>
              <p style={{ fontSize: '1.125rem', color: 'rgba(255,255,255,0.45)' }}>
                From identity primitives to a full ecosystem of composable modules.
              </p>
            </div>

            {/* V1 */}
            <div style={{ marginBottom: '3rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                <div style={{ padding: '0.375rem 1rem', backgroundColor: 'rgba(52, 211, 153, 0.1)', border: '1px solid rgba(52, 211, 153, 0.2)', borderRadius: '9999px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.05em' }}>V1</span>
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff' }}>Identity + Agent Authorization</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingLeft: '1rem', borderLeft: '2px solid rgba(52, 211, 153, 0.15)' }}>
                {[
                  {
                    milestone: 'A',
                    title: 'Core Spec & Consistency',
                    status: 'In Progress',
                    statusColor: '#f59e0b',
                    items: [
                      'Canonical human profile (no legacy split)',
                      'Canonical agent profile + key rotation',
                      'Capabilities v1 (scopes, limits, allowlists, expiry)',
                      'Receipts v1 (standard action log)',
                    ],
                  },
                  {
                    milestone: 'B',
                    title: 'Developer Adoption',
                    status: 'Planned',
                    statusColor: '#60a5fa',
                    items: [
                      'TypeScript SDK + documentation + examples',
                      'Dashboard (manage humans, agents, capabilities, receipts)',
                      'Integration guide: how any Solana program validates capability + emits receipt',
                    ],
                  },
                  {
                    milestone: 'C',
                    title: 'Verification Network',
                    status: 'Planned',
                    statusColor: '#60a5fa',
                    items: [
                      'Issuer framework + revocation',
                      'KYC optional via issuer plugin',
                      'Trust tiers UI (Tier 0 / 1 / 2 badges)',
                    ],
                  },
                ].map((m, i) => (
                  <div key={i} style={{ padding: '1.5rem', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', position: 'relative' }}>
                    {/* Connector dot */}
                    <div style={{ position: 'absolute', left: '-1.375rem', top: '1.75rem', width: '10px', height: '10px', backgroundColor: '#0a0a0a', border: '2px solid rgba(52, 211, 153, 0.4)', borderRadius: '50%' }} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Milestone {m.milestone}</span>
                        <span style={{ fontSize: '1rem', fontWeight: 600, color: '#fff' }}>{m.title}</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: m.statusColor, backgroundColor: `${m.statusColor}15`, padding: '0.25rem 0.75rem', borderRadius: '9999px', border: `1px solid ${m.statusColor}30` }}>
                        {m.status}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {m.items.map((item, j) => (
                        <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                          <span style={{ marginTop: '0.35rem', width: '5px', height: '5px', backgroundColor: 'rgba(52, 211, 153, 0.4)', borderRadius: '50%', flexShrink: 0 }} />
                          <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* V2 */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                <div style={{ padding: '0.375rem 1rem', backgroundColor: 'rgba(167, 139, 250, 0.1)', border: '1px solid rgba(167, 139, 250, 0.2)', borderRadius: '9999px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>V2</span>
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff' }}>Ecosystem Modules</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', paddingLeft: '1rem', borderLeft: '2px solid rgba(167, 139, 250, 0.15)' }}>
                {[
                  { title: 'Payment Rails', desc: 'Agent spending with escrow and limits' },
                  { title: 'Task Marketplace', desc: 'Request and fulfill agent services' },
                  { title: 'Document Signing', desc: 'Multi-party on-chain attestation' },
                  { title: 'Runtime Attestations', desc: 'TEE and signed build verification' },
                ].map((item, i) => (
                  <div key={i} style={{ padding: '1.25rem', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff', marginBottom: '0.375rem' }}>{item.title}</h4>
                    <p style={{ fontSize: '0.825rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════ */}
        {/* CTA                                        */}
        {/* ═══════════════════════════════════════════ */}
        <section style={{ padding: '8rem 1.5rem', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(2rem, 5vw, 2.75rem)', fontWeight: 700, marginBottom: '1rem', color: '#fff' }}>
              Start Building
            </h2>
            <p style={{ fontSize: '1.125rem', color: 'rgba(255,255,255,0.45)', maxWidth: '550px', margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
              HumanRail is live on Solana devnet. Connect your wallet, create your identity, and register your first agent.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
              <a href="/dashboard" style={{ padding: '0.875rem 2.5rem', background: 'linear-gradient(90deg, #059669, #10b981)', color: '#fff', fontWeight: 700, borderRadius: '9999px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Open Dashboard <Icons.arrowRight />
              </a>
              <a href="https://github.com/humanrail-labs/human-rail" target="_blank" rel="noopener noreferrer"
                style={{ padding: '0.875rem 2.5rem', backgroundColor: 'transparent', color: '#fff', fontWeight: 600, borderRadius: '9999px', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Icons.github /> Documentation
              </a>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════ */}
        {/* FOOTER                                     */}
        {/* ═══════════════════════════════════════════ */}
        <footer style={{ padding: '2.5rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.4)' }}>
              <Icons.rail />
              <span style={{ fontSize: '0.875rem' }}>HumanRail Protocol</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.875rem' }}>
              <a href="/dashboard" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Dashboard</a>
              <a href="https://github.com/humanrail-labs/human-rail" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>GitHub</a>
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>Solana Devnet</span>
            </div>
          </div>
        </footer>
      </div>

      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
}
