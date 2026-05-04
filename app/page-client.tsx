'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import Link from 'next/link';
import { useConnection } from '@solana/wallet-adapter-react';
import { motion } from 'framer-motion';
import { getProgramId, parseHumanProfile, parseAgentProfile } from '@/lib/programs';
import { useCluster } from '@/lib/solana/cluster-context';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import {
  Shield, Zap, Eye, Users, ArrowRight, Github, Wallet, Bot, Fingerprint, Activity, FlaskConical,
} from 'lucide-react';

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
// COUNT UP ANIMATION
// ============================================
function useCountUp(end: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    let startTime: number;
    let raf: number;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        raf = requestAnimationFrame(step);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [started, end, duration]);

  return { count, ref };
}

function StatCard({ value, label, suffix = "" }: { value: number; label: string; suffix?: string }) {
  const { count, ref } = useCountUp(value);
  return (
    <div ref={ref} style={{ padding: '1.5rem', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '1rem', textAlign: 'center' }}>
      <div style={{ fontSize: '2rem', fontWeight: 700, color: '#fff' }}>{count.toLocaleString()}{suffix}</div>
      <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.25rem' }}>{label}</div>
    </div>
  );
}

// ============================================
// MAIN LANDING PAGE
// ============================================
export default function AgentVaultLanding() {
  const { connection } = useConnection();
  const { cluster } = useCluster();
  const [stats, setStats] = useState({ humans: 0, agents: 0, receipts: 0 });

  useEffect(() => {
    if (!connection) return;
    (async () => {
      try {
        const [humanAccounts, agentAccounts, receiptAccounts] = await Promise.all([
          connection.getProgramAccounts(getProgramId(cluster, 'humanRegistry')).catch(() => []),
          connection.getProgramAccounts(getProgramId(cluster, 'agentRegistry')).catch(() => []),
          connection.getProgramAccounts(getProgramId(cluster, 'receipts')).catch(() => []),
        ]);

        // Human profiles are larger than attestations; filter by minimum size roughly
        const humanProfiles = humanAccounts.filter(({ account }) => account.data.length > 150);
        setStats({
          humans: humanProfiles.length,
          agents: agentAccounts.length,
          receipts: receiptAccounts.length,
        });
      } catch {
        // ignore
      }
    })();
  }, [connection, cluster]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', overflowX: 'hidden' }}>
      <DottedSurface />

      {/* Gradient Overlays */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1 }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0.9) 100%)' }} />
        <div style={{ position: 'absolute', top: '-200px', left: '50%', transform: 'translateX(-50%)', width: '800px', height: '600px', background: 'radial-gradient(ellipse, rgba(16, 185, 129, 0.12) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 10 }}>

        {/* HERO */}
        <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '0 1.5rem' }}>
          {/* Nav */}
          <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: '#fff' }}>
              <Image
                src="/humanrail-logo.png"
                alt="HumanRail"
                width={36}
                height={36}
                className="h-9 w-9 rounded-lg"
              />
              <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>HumanRail</span>
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <a href="https://github.com/humanrail-labs/human-rail" target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
                <Github className="h-5 w-5" /><span>GitHub</span>
              </a>
              <Link href="/mandara/app">
                <Button className="gap-2 rounded-full bg-sky-600 px-6 text-white hover:bg-sky-700">
                  Open Console <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Hero content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', paddingBottom: '4rem' }}>
            <div style={{ maxWidth: '900px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '9999px', marginBottom: '2rem' }}>
                <span style={{ width: '8px', height: '8px', backgroundColor: '#22c55e', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
                <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>Live on Solana Devnet</span>
              </div>

              <h1 style={{ fontSize: 'clamp(2.5rem, 8vw, 4.5rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
                HumanRail Protocol<br />
                <span style={{ background: 'linear-gradient(90deg, #34d399, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  AI Agent Guardrails
                </span>
              </h1>

              <p style={{ fontSize: 'clamp(1.125rem, 3vw, 1.375rem)', color: 'rgba(255,255,255,0.55)', maxWidth: '640px', margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
                The on-chain protocol for policy-governed AI agents on Solana. Built by HumanRail Labs. Launch Mandara to deploy, monitor, and control your agents with full oversight.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '4rem' }}>
                <Link href="/mandara/app">
                  <Button className="gap-2 rounded-full bg-sky-600 px-8 py-6 text-lg font-semibold text-white hover:bg-sky-700">
                    Launch Mandara <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/mandara/app/onboarding">
                  <Button variant="outline" className="gap-2 rounded-full border-white/15 px-8 py-6 text-lg font-medium text-white hover:bg-white/5">
                    Start Onboarding <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/vault/dwallets">
                  <Button variant="outline" className="gap-2 rounded-full border-white/15 px-8 py-6 text-lg font-medium text-white hover:bg-white/5">
                    <FlaskConical className="h-5 w-5" /> Advanced Technical Proof
                  </Button>
                </Link>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', maxWidth: '700px', margin: '0 auto' }}>
                {[
                  { value: stats.humans, label: 'Verified Humans' },
                  { value: stats.agents, label: 'Registered Agents' },
                  { value: stats.receipts, label: 'On-Chain Receipts' },
                  { value: 7, label: 'Protocol Programs', suffix: '' },
                ].map((stat, i) => (
                  <StatCard key={i} value={stat.value} label={stat.label} suffix={stat.suffix} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section style={{ padding: '6rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
              <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', fontWeight: 700, color: '#fff' }}>How It Works</h2>
              <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.45)', marginTop: '0.5rem' }}>From identity to deployment in three simple steps</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
              {[
                { step: '01', icon: <Fingerprint className="h-6 w-6" />, title: 'Verify Your Identity', desc: 'Create an on-chain human profile that serves as the root of trust for every agent you deploy.' },
                { step: '02', icon: <Bot className="h-6 w-6" />, title: 'Deploy Your Agent', desc: 'Register an AI agent with a unique wallet, bounded capabilities, and programmable guardrails.' },
                { step: '03', icon: <Shield className="h-6 w-6" />, title: 'Stay in Control', desc: 'Monitor real-time activity, adjust limits, and emergency-freeze any agent with one click.' },
              ].map((item, i) => (
                <div key={i} style={{ padding: '1.75rem', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{ width: '44px', height: '44px', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.15)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399' }}>
                      {item.icon}
                    </div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'rgba(255,255,255,0.2)' }}>{item.step}</span>
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem', color: '#fff' }}>{item.title}</h3>
                  <p style={{ color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, fontSize: '0.925rem' }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section style={{ padding: '6rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
              <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', fontWeight: 700, color: '#fff' }}>Features</h2>
              <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.45)', marginTop: '0.5rem' }}>Built for humans who manage autonomous agents</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
              {[
                { icon: <Wallet className="h-6 w-6" />, title: 'Bounded Authority', desc: 'Set per-transaction, daily, and total spending limits that are enforced on-chain.' },
                { icon: <Zap className="h-6 w-6" />, title: 'Emergency Freeze', desc: 'One-click agent shutdown when needed. Instantly revoke all capabilities.' },
                { icon: <Eye className="h-6 w-6" />, title: 'Full Auditability', desc: 'Every action creates an immutable on-chain receipt. Compliance from day one.' },
                { icon: <Users className="h-6 w-6" />, title: 'Multi-Agent Management', desc: 'Deploy and control multiple agents from a single dashboard with unified oversight.' },
              ].map((item, i) => (
                <div key={i} style={{ padding: '1.5rem', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '1rem' }}>
                  <div style={{ width: '44px', height: '44px', backgroundColor: 'rgba(96, 165, 250, 0.1)', border: '1px solid rgba(96, 165, 250, 0.15)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: '#60a5fa' }}>
                    {item.icon}
                  </div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.5rem', color: '#fff' }}>{item.title}</h3>
                  <p style={{ color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, fontSize: '0.9rem' }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={{ padding: '6rem 1.5rem', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', fontWeight: 700, marginBottom: '1rem', color: '#fff' }}>
              Ready to deploy your first agent?
            </h2>
            <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.45)', maxWidth: '550px', margin: '0 auto 2rem', lineHeight: 1.7 }}>
              Mandara is live on Solana devnet. Connect your wallet, verify your identity, and start building with guardrails. Or try the Mandara Console for policy-governed AI agent wallets.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
              <Link href="/vault">
                <Button className="gap-2 rounded-full bg-emerald-600 px-8 py-6 text-lg font-semibold text-white hover:bg-emerald-700">
                  Launch Vault <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <a href="https://github.com/humanrail-labs/human-rail" target="_blank" rel="noopener noreferrer"
                style={{ padding: '0.875rem 2rem', backgroundColor: 'transparent', color: '#fff', fontWeight: 600, borderRadius: '9999px', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Github className="h-5 w-5" /> Documentation
              </a>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{ padding: '2.5rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.4)' }}>
              <Shield className="h-5 w-5" />
              <span style={{ fontSize: '0.875rem' }}>HumanRail Protocol · Built by HumanRail Labs</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.875rem' }}>
              <Link href="/vault" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Vault</Link>
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
