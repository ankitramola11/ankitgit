'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { STORAGE_KEY, emptySession, normalizeSession, type FrictionType, type SessionData } from '../lib/session';

const frictionLabels: Record<FrictionType, string> = {
  none: 'none',
  unclear_start: 'unclear start',
  overwhelm: 'overwhelm',
  difficulty_shock: 'difficulty shock',
  avoidance_loop: 'avoidance loop',
  decision_block: 'decision block'
};

export default function ReportPage() {
  const [session, setSession] = useState<SessionData>(emptySession);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setSession(normalizeSession(JSON.parse(saved)));
      } catch {
        setSession(emptySession());
      }
    }
  }, []);

  const frictionCounts = useMemo(() => {
    const map: Record<FrictionType, number> = {
      none: 0,
      unclear_start: 0,
      overwhelm: 0,
      difficulty_shock: 0,
      avoidance_loop: 0,
      decision_block: 0
    };

    for (const friction of session.frictionHistory) {
      map[friction] += 1;
    }

    if (Object.values(map).every((count) => count === 0)) {
      map[session.currentFriction] += 1;
    }

    return map;
  }, [session.currentFriction, session.frictionHistory]);

  const primaryFriction = useMemo(() => {
    const ranked = (Object.entries(frictionCounts) as [FrictionType, number][])
      .filter(([type]) => type !== 'none')
      .sort((a, b) => b[1] - a[1]);
    return ranked[0]?.[0] ?? 'unclear_start';
  }, [frictionCounts]);

  const avgPause =
    session.pauseDurations.length > 0
      ? Math.round(session.pauseDurations.reduce((a, b) => a + b, 0) / session.pauseDurations.length / 1000)
      : 0;

  const abortTendency = useMemo(() => {
    const retreatEvents = session.events.filter((e) => e.type === 'tab_switch' || e.type === 'delete').length;
    if (retreatEvents > 35) return 'High structural retreat under ambiguity';
    if (retreatEvents > 16) return 'Moderate switching before execution stabilizes';
    return 'Low retreat behavior after initial orientation';
  }, [session.events]);

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
    { label: 'Deletes', value: session.events.filter((e) => e.type === 'delete').length }
  ];

  const timeline = session.events.slice(-40);
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
          <Card title="Primary Friction Type" value={frictionLabels[primaryFriction]} />
          <Card title="Abort Tendencies" value={abortTendency} />
          <Card title="Optimal Start Condition" value={optimalStart} />
        </section>

        <section className="panel rounded-sm p-5">
          <h2 className="text-sm uppercase tracking-[0.18em] text-instrument-muted">Generated Analysis</h2>
          <p className="mt-3 text-sm leading-relaxed text-instrument-muted">
            You stall when interpretation precedes execution. Mean pause duration remained {avgPause} seconds while
            friction signatures clustered around {frictionLabels[primaryFriction]}. Structural intervention reduced
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

            <div className="mt-6 border-t border-instrument-line pt-4">
              <h4 className="text-[10px] uppercase tracking-[0.18em] text-instrument-muted">Friction distribution</h4>
              <div className="mt-2 space-y-2 text-xs">
                {(Object.entries(frictionCounts) as [FrictionType, number][])
                  .filter(([type]) => type !== 'none')
                  .map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between border border-instrument-line px-2 py-1">
                      <span>{frictionLabels[type]}</span>
                      <span>{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <div className="panel rounded-sm p-4">
            <h3 className="text-xs uppercase tracking-[0.18em] text-instrument-muted">Timeline of interaction</h3>
            <div className="mt-4 h-64 overflow-y-auto border border-instrument-line p-3 text-xs">
              {timeline.map((event, idx) => (
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
