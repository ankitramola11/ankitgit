'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const terminalFrames = [
  '$ open task_spec.md\n> task loaded\n> user cursor idle...\n',
  '$ open task_spec.md\n> task loaded\n> user cursor idle...\n> hesitation detected\n',
  '$ open task_spec.md\n> task loaded\n> hesitation detected\n> intervention: starter structure injected\n'
];

export default function LandingPage() {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setFrame((current) => (current + 1) % terminalFrames.length);
    }, 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <main className="min-h-screen px-6 py-12 lg:px-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12">
        <section className="grid gap-10 lg:grid-cols-2">
          <div className="space-y-6">
            <p className="text-xs uppercase tracking-[0.2em] text-instrument-muted">Diagnostic Interface</p>
            <h1 className="text-4xl font-semibold leading-tight lg:text-5xl">
              Humans don&apos;t avoid work. They avoid unclear beginnings.
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-instrument-muted">
              Life Friction Analyzer models the cognitive gap between intent and execution. It inspects hesitation,
              pause behavior, and restructuring needs in real-time so tasks become executable before avoidance patterns
              intensify.
            </p>
            <Link
              href="/workspace"
              className="inline-flex border border-instrument-ink px-6 py-3 text-sm uppercase tracking-[0.1em] transition hover:bg-instrument-ink hover:text-white"
            >
              Start Session
            </Link>
          </div>

          <div className="panel rounded-sm p-5">
            <p className="mb-3 text-xs uppercase tracking-[0.2em] text-instrument-muted">Simulated Activity Stream</p>
            <pre className="h-56 overflow-hidden whitespace-pre-wrap bg-[#111827] p-4 font-mono text-sm text-[#d1d5db]">
              {terminalFrames[frame]}
            </pre>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            'detects hesitation patterns',
            'identifies decision paralysis',
            'modifies task structure in real time'
          ].map((feature) => (
            <div key={feature} className="panel rounded-sm p-4 text-sm text-instrument-muted">
              {feature}
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
