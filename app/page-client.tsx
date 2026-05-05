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
      className="fixed inset-0 z-0 pointer-events-none"
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
    <div ref={ref} className="p-6 bg-white/[0.03] border border-white/[0.06] rounded-xl text-center">
      <div className="text-3xl font-bold text-white">{count.toLocaleString()}{suffix}</div>
      <div className="text-sm text-white/40 mt-1">{label}</div>
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
    <div className="min-h-screen bg-neutral-950 text-white overflow-x-hidden">
      <DottedSurface />

      {/* Gradient Overlays */}
      <div className="fixed inset-0 pointer-events-none z-[1]">
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0.9) 100%)' }}
        />
        <div
          className="absolute -top-[200px] left-1/2 -translate-x-1/2 w-[800px] h-[600px] blur-[60px]"
          style={{ background: 'radial-gradient(ellipse, rgba(16, 185, 129, 0.12) 0%, transparent 70%)' }}
        />
      </div>

      <div className="relative z-10">

        {/* HERO */}
        <section className="min-h-screen flex flex-col px-6">
          {/* Nav */}
          <div className="w-full max-w-[1200px] mx-auto py-6 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 no-underline text-white">
              <Image
                src="/humanrail-logo.png"
                alt="HumanRail"
                width={36}
                height={36}
                className="h-9 w-9 rounded-lg"
              />
              <span className="text-xl font-bold">HumanRail</span>
            </Link>
            <div className="flex items-center gap-6">
              <a
                href="https://github.com/humanrail-labs/human-rail"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-2 text-white/70 no-underline hover:text-white transition-colors text-sm"
              >
                <Github className="h-5 w-5" /><span>GitHub</span>
              </a>
              <Link href="/mandara/app">
                <Button size="sm" className="gap-2 rounded-full">
                  Open Console <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Hero content */}
          <div className="flex-1 flex flex-col items-center justify-center text-center pb-16">
            <div className="max-w-[900px]">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/[0.05] border border-white/10 rounded-full mb-8">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-[pulse-dot_2s_ease-in-out_infinite]" />
                <span className="text-sm text-white/70">Live on Solana Devnet</span>
              </div>

              <h1 className="text-[clamp(2.5rem,8vw,4.5rem)] font-extrabold leading-[1.1] mb-6 tracking-tight">
                HumanRail Protocol<br />
                <span className="bg-gradient-to-r from-emerald-400 via-sky-400 to-violet-400 bg-clip-text text-transparent">
                  AI Agent Guardrails
                </span>
              </h1>

              <p className="text-[clamp(1.125rem,3vw,1.375rem)] text-white/55 max-w-[640px] mx-auto mb-10 leading-relaxed">
                The on-chain protocol for policy-governed AI agents on Solana. Built by HumanRail Labs. Launch Mandara to deploy, monitor, and control your agents with full oversight.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
                <Link href="/mandara/app">
                  <Button size="lg" className="gap-2 rounded-full">
                    Launch Mandara <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/vault/dwallets">
                  <Button variant="outline" size="lg" className="gap-2 rounded-full">
                    <FlaskConical className="h-5 w-5" /> Advanced Technical Proof
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-[700px] mx-auto">
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
        <section className="py-24 px-6 border-t border-white/5">
          <div className="max-w-[1000px] mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-[clamp(1.75rem,4vw,2.25rem)] font-bold text-white">How It Works</h2>
              <p className="text-base text-white/45 mt-2">From identity to deployment in three simple steps</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { step: '01', icon: <Fingerprint className="h-6 w-6" />, title: 'Verify Your Identity', desc: 'Create an on-chain human profile that serves as the root of trust for every agent you deploy.' },
                { step: '02', icon: <Bot className="h-6 w-6" />, title: 'Deploy Your Agent', desc: 'Register an AI agent with a unique wallet, bounded capabilities, and programmable guardrails.' },
                { step: '03', icon: <Shield className="h-6 w-6" />, title: 'Stay in Control', desc: 'Monitor real-time activity, adjust limits, and emergency-freeze any agent with one click.' },
              ].map((item, i) => (
                <div key={i} className="p-7 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-11 h-11 bg-emerald-500/10 border border-emerald-500/15 rounded-lg flex items-center justify-center text-emerald-400">
                      {item.icon}
                    </div>
                    <span className="text-sm font-bold text-white/20">{item.step}</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-white">{item.title}</h3>
                  <p className="text-white/45 leading-relaxed text-[0.925rem]">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="py-24 px-6 border-t border-white/5">
          <div className="max-w-[1000px] mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-[clamp(1.75rem,4vw,2.25rem)] font-bold text-white">Features</h2>
              <p className="text-base text-white/45 mt-2">Built for humans who manage autonomous agents</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: <Wallet className="h-6 w-6" />, title: 'Bounded Authority', desc: 'Set per-transaction, daily, and total spending limits that are enforced on-chain.' },
                { icon: <Zap className="h-6 w-6" />, title: 'Emergency Freeze', desc: 'One-click agent shutdown when needed. Instantly revoke all capabilities.' },
                { icon: <Eye className="h-6 w-6" />, title: 'Full Auditability', desc: 'Every action creates an immutable on-chain receipt. Compliance from day one.' },
                { icon: <Users className="h-6 w-6" />, title: 'Multi-Agent Management', desc: 'Deploy and control multiple agents from a single dashboard with unified oversight.' },
              ].map((item, i) => (
                <div key={i} className="p-6 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                  <div className="w-11 h-11 bg-sky-500/10 border border-sky-500/15 rounded-lg flex items-center justify-center mb-4 text-sky-400">
                    {item.icon}
                  </div>
                  <h3 className="text-base font-semibold mb-2 text-white">{item.title}</h3>
                  <p className="text-white/40 leading-relaxed text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 px-6 text-center border-t border-white/5">
          <div className="max-w-[700px] mx-auto">
            <h2 className="text-[clamp(1.75rem,4vw,2.25rem)] font-bold mb-4 text-white">
              Ready to deploy your first agent?
            </h2>
            <p className="text-base text-white/45 max-w-[550px] mx-auto mb-8 leading-relaxed">
              Mandara is live on Solana devnet. Connect your wallet, verify your identity, and start building with guardrails. Or try the Mandara Console for policy-governed AI agent wallets.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/vault">
                <Button size="lg" className="gap-2 rounded-full">
                  Launch Vault <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <a
                href="https://github.com/humanrail-labs/human-rail"
                target="_blank"
                rel="noopener noreferrer"
                className="py-3.5 px-8 bg-transparent text-white font-semibold rounded-full no-underline border border-white/15 flex items-center gap-2 hover:bg-white/[0.03] transition-colors"
              >
                <Github className="h-5 w-5" /> Documentation
              </a>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="py-10 px-6 border-t border-white/5">
          <div className="max-w-[1200px] mx-auto flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2 text-white/40">
              <Image
                src="/humanrail-logo.png"
                alt="HumanRail"
                width={24}
                height={24}
                className="object-contain rounded"
              />
              <span className="text-sm">HumanRail Protocol · Built by HumanRail Labs</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/vault" className="text-white/40 no-underline hover:text-white/70 transition-colors">Vault</Link>
              <a href="https://github.com/humanrail-labs/human-rail" target="_blank" rel="noopener noreferrer" className="text-white/40 no-underline hover:text-white/70 transition-colors">GitHub</a>
              <span className="text-white/30">Solana Devnet</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
