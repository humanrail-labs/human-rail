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

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      1,
      10000
    );
    camera.position.set(0, 400, 1000);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);

    containerRef.current.appendChild(renderer.domElement);

    const positions: number[] = [];
    const colors: number[] = [];

    const geometry = new THREE.BufferGeometry();

    for (let ix = 0; ix < AMOUNTX; ix++) {
      for (let iy = 0; iy < AMOUNTY; iy++) {
        const x = ix * SEPARATION - (AMOUNTX * SEPARATION) / 2;
        const y = 0;
        const z = iy * SEPARATION - (AMOUNTY * SEPARATION) / 2;

        positions.push(x, y, z);
        colors.push(1, 1, 1);
      }
    }

    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3)
    );
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 5,
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    let count = 0;
    let animationId: number;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      const positionAttribute = geometry.attributes.position;
      const positionsArray = positionAttribute.array as Float32Array;

      let i = 0;
      for (let ix = 0; ix < AMOUNTX; ix++) {
        for (let iy = 0; iy < AMOUNTY; iy++) {
          const index = i * 3;
          positionsArray[index + 1] =
            Math.sin((ix + count) * 0.3) * 50 +
            Math.sin((iy + count) * 0.5) * 50;
          i++;
        }
      }

      positionAttribute.needsUpdate = true;
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
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
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
};

// ============================================
// MAIN LANDING PAGE
// ============================================
export default function HumanRailLanding() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', overflowX: 'hidden' }}>
      {/* 3D Background */}
      <DottedSurface />

      {/* Gradient Overlays */}
      <div style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 1,
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0.9) 100%)',
        }} />
        <div style={{
          position: 'absolute',
          top: '-200px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '800px',
          height: '600px',
          background: 'radial-gradient(ellipse, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }} />
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 10 }}>

        {/* Hero Section */}
        <section style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '0 1.5rem',
        }}>
          {/* Nav buttons inside hero - at the top */}
          <div style={{
            width: '100%',
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '1.5rem 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: '#fff' }}>
              <Icons.rail />
              <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>HumanRail</span>
            </a>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <a
                href="https://github.com/humanrail-labs/human-rail"
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}
              >
                <Icons.github />
                <span>GitHub</span>
              </a>
              <a
                href="/human"
                style={{
                  padding: '0.625rem 1.25rem',
                  backgroundColor: '#fff',
                  color: '#000',
                  fontWeight: 600,
                  borderRadius: '9999px',
                  textDecoration: 'none',
                }}
              >
                Launch App
              </a>
            </div>
          </div>

          {/* Hero content - centered */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            paddingBottom: '4rem',
          }}>
            <div style={{ maxWidth: '900px' }}>
              {/* Badge */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '9999px',
                marginBottom: '2rem',
              }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#22c55e',
                  borderRadius: '50%',
                  animation: 'pulse 2s infinite',
                }} />
                <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>Live on Solana Devnet</span>
              </div>

              {/* Main Title */}
              <h1 style={{
                fontSize: 'clamp(2.5rem, 8vw, 4.5rem)',
                fontWeight: 800,
                lineHeight: 1.1,
                marginBottom: '1.5rem',
                letterSpacing: '-0.02em',
              }}>
                Identity Rails for<br />
                <span style={{
                  background: 'linear-gradient(90deg, #60a5fa, #a78bfa, #f472b6)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  AI Agents
                </span>
              </h1>

              {/* Subtitle */}
              <p style={{
                fontSize: 'clamp(1.125rem, 3vw, 1.5rem)',
                color: 'rgba(255,255,255,0.6)',
                maxWidth: '600px',
                margin: '0 auto 2.5rem',
                lineHeight: 1.6,
              }}>
                Verified human identity. Delegated agent authority. 
                Full auditability. Built on Solana.
              </p>

              {/* CTA Buttons */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem',
                marginBottom: '4rem',
              }}>
                <a
                  href="/human"
                  style={{
                    padding: '1rem 2rem',
                    backgroundColor: '#fff',
                    color: '#000',
                    fontWeight: 700,
                    borderRadius: '9999px',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  Launch App
                  <Icons.external />
                </a>
                <a
                  href="https://github.com/humanrail-labs/human-rail"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '1rem 2rem',
                    backgroundColor: 'transparent',
                    color: '#fff',
                    fontWeight: 600,
                    borderRadius: '9999px',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                >
                  <Icons.github />
                  View Source
                </a>
              </div>

              {/* Stats */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '1rem',
                maxWidth: '700px',
                margin: '0 auto',
              }}>
                {[
                  { value: '7', label: 'Programs' },
                  { value: '9/9', label: 'Critical Fixes' },
                  { value: '40', label: 'Audit Issues' },
                  { value: '$20K', label: 'Raising' },
                ].map((stat, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '1.25rem',
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '1rem',
                    }}
                  >
                    <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff' }}>{stat.value}</div>
                    <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)' }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section style={{ padding: '8rem 1.5rem' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
              <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 700, marginBottom: '1rem', color: '#fff' }}>
                Protocol Stack
              </h2>
              <p style={{ fontSize: '1.25rem', color: 'rgba(255,255,255,0.5)' }}>
                Seven programs. One unified identity layer.
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1.5rem',
            }}>
              {[
                {
                  icon: <Icons.users />,
                  title: 'Human Registry',
                  desc: 'Verified profiles with third-party attestations',
                  address: '7f9Usct...n5eh',
                },
                {
                  icon: <Icons.cpu />,
                  title: 'Agent Registry',
                  desc: 'AI agents linked to human principals',
                  address: 'G9cks2i...nZPQ5',
                },
                {
                  icon: <Icons.shield />,
                  title: 'Delegation',
                  desc: 'Capability tokens with spending controls',
                  address: '5LJLTUQ...FdtR',
                },
                {
                  icon: <Icons.card />,
                  title: 'Human Pay',
                  desc: 'PDA-controlled escrow payments',
                  address: 'AZWKLJ...z22r',
                },
                {
                  icon: <Icons.file />,
                  title: 'Document Registry',
                  desc: 'On-chain document signing',
                  address: 'EUVJE9V...c78N',
                },
                {
                  icon: <Icons.checkCircle />,
                  title: 'Receipts + DataBlink',
                  desc: 'Transaction auditability',
                  address: 'Fgz7HoB...dXnGr',
                },
              ].map((feature, i) => (
                <div
                  key={i}
                  style={{
                    padding: '1.5rem',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '1rem',
                  }}
                >
                  <div style={{
                    width: '48px',
                    height: '48px',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1rem',
                  }}>
                    {feature.icon}
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: '#fff' }}>
                    {feature.title}
                  </h3>
                  <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem' }}>
                    {feature.desc}
                  </p>
                  <code style={{ fontSize: '0.75rem', color: 'rgba(96, 165, 250, 0.7)', fontFamily: 'monospace' }}>
                    {feature.address}
                  </code>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section style={{ padding: '8rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.2)',
                borderRadius: '9999px',
                marginBottom: '1.5rem',
              }}>
                <Icons.check />
                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#22c55e' }}>Security First</span>
              </div>
              <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 700, marginBottom: '1rem', color: '#fff' }}>
                Audit Complete
              </h2>
              <p style={{ fontSize: '1.25rem', color: 'rgba(255,255,255,0.5)' }}>
                Transparent security disclosure. All critical vulnerabilities resolved.
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '1rem',
            }}>
              {[
                { severity: 'Critical', found: 9, fixed: 9, color: '#ef4444' },
                { severity: 'High', found: 14, fixed: 1, color: '#f97316' },
                { severity: 'Medium', found: 10, fixed: 0, color: '#eab308' },
                { severity: 'Low', found: 7, fixed: 0, color: '#3b82f6' },
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    padding: '1.25rem',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{
                    width: '12px',
                    height: '12px',
                    backgroundColor: item.color,
                    borderRadius: '50%',
                    margin: '0 auto 0.75rem',
                  }} />
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>
                    {item.fixed}/{item.found}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)' }}>
                    {item.severity}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section style={{ padding: '8rem 1.5rem', textAlign: 'center' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 700, marginBottom: '1rem', color: '#fff' }}>
              Ready to Build?
            </h2>
            <p style={{ fontSize: '1.25rem', color: 'rgba(255,255,255,0.5)', maxWidth: '600px', margin: '0 auto 2.5rem' }}>
              HumanRail is live on Solana devnet. Connect your wallet and create your first identity rail.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
              <a
                href="/human"
                style={{
                  padding: '1rem 2.5rem',
                  background: 'linear-gradient(90deg, #3b82f6, #a855f7)',
                  color: '#fff',
                  fontWeight: 700,
                  borderRadius: '9999px',
                  textDecoration: 'none',
                }}
              >
                Open Demo App
              </a>
              <a
                href="https://github.com/humanrail-labs/human-rail"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '1rem 2.5rem',
                  backgroundColor: 'transparent',
                  color: '#fff',
                  fontWeight: 600,
                  borderRadius: '9999px',
                  textDecoration: 'none',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              >
                Read Documentation
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ padding: '2.5rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.5)' }}>
              <Icons.rail />
              <span>HumanRail Protocol © 2026</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.875rem' }}>
              <a href="/human" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Demo</a>
              <a href="https://github.com/humanrail-labs/human-rail" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>GitHub</a>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>Solana Devnet</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Global Styles */}
      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        html {
          scroll-behavior: smooth;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}