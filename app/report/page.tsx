'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { STORAGE_KEY, emptySession, type SessionData } from '../lib/session';

export default function ReportPage() {
  const [session, setSession] = useState<SessionData>(emptySession);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setSession(JSON.parse(saved) as SessionData);
    }
  }, []);

  const primaryFriction = session.currentFriction === 'none' ? 'unclear_start' : session.currentFriction;
  const avgPause =
    session.pauseDurations.length > 0
      ? Math.round(session.pauseDurations.reduce((a, b) => a + b, 0) / session.pauseDurations.length / 1000)
      : 0;

  const abortTendency = useMemo(() => {
    if (session.tabSwitches > 8 || session.deletes > 30) return 'High structural retreat under ambiguity';
    if (session.tabSwitches > 4 || session.pauseDurations.length > 5) return 'Moderate switching before execution stabilizes';
    return 'Low retreat behavior after initial orientation';
  }, [session]);

  const optimalStart = useMemo(() => {
    if (primaryFriction === 'unclear_start') return 'Begin with prefilled starter skeleton and one explicit operation.';
    if (primaryFriction === 'overwhelm') return 'Lock first move to single sentence before expansion.';
    if (primaryFriction === 'difficulty_shock') return 'Use reduced-complexity sample before original problem.';
    if (primaryFriction === 'decision_block') return 'Collapse options into one mandatory next step.';
    return 'Apply fixed micro-start countdown before free navigation.';
  }, [primaryFriction]);

  const pausesVsActivity = [
    { label: 'Pauses', value: session.pauseDurations.length },
    { label: 'Keystroke events', value: session.events.filter((e) => e.type === 'keystroke').length },
    { label: 'Deletes', value: session.deletes }
  ];

  const maxBar = Math.max(...pausesVsActivity.map((d) => d.value), 1);

  return (
    <main className="min-h-screen p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">End Session Cognitive Report</h1>
          <Link href="/workspace" className="text-xs uppercase tracking-[0.2em] underline">
            Return to Workspace
          </Link>
        </div>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card title="Intent → Action Delay" value={`${Math.floor(session.actionDelay / 1000)} seconds`} />
          <Card title="Primary Friction Type" value={primaryFriction.replace('_', ' ')} />
          <Card title="Abort Tendencies" value={abortTendency} />
          <Card title="Optimal Start Condition" value={optimalStart} />
        </section>

        <section className="panel rounded-sm p-5">
          <h2 className="text-sm uppercase tracking-[0.18em] text-instrument-muted">Generated Analysis</h2>
          <p className="mt-3 text-sm leading-relaxed text-instrument-muted">
            You stall when interpretation precedes execution. Mean pause duration remained {avgPause} seconds while
            friction signatures clustered around {primaryFriction.replace('_', ' ')}. Structural intervention reduced
            open-ended choice and restored actionable sequence integrity.
          </p>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="panel rounded-sm p-4">
            <h3 className="text-xs uppercase tracking-[0.18em] text-instrument-muted">Bar Chart: pauses vs activity</h3>
            <div className="mt-4 space-y-3">
              {pausesVsActivity.map((item) => (
                <div key={item.label}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>{item.label}</span>
                    <span>{item.value}</span>
                  </div>
                  <div className="h-3 bg-[#e5e7eb]">
                    <div className="h-3 bg-[#4b5563]" style={{ width: `${(item.value / maxBar) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel rounded-sm p-4">
            <h3 className="text-xs uppercase tracking-[0.18em] text-instrument-muted">Timeline of interaction</h3>
            <div className="mt-4 h-56 overflow-y-auto border border-instrument-line p-3 text-xs">
              {session.events.map((event, idx) => (
                <div key={`${event.type}-${idx}`} className="mb-2 border-b border-instrument-line pb-1">
                  <span className="font-medium">t+{Math.floor(event.t / 1000)}s</span> → {event.type}
                  {event.value !== undefined ? ` (${event.value})` : ''}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <article className="panel rounded-sm p-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-instrument-muted">{title}</p>
      <p className="mt-2 text-sm leading-relaxed">{value}</p>
    </article>
  );
}
