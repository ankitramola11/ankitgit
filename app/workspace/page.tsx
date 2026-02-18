'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FrictionType, STORAGE_KEY, emptySession, normalizeSession, type SessionData } from '../lib/session';

const taskTabs = ['Coding Editor', 'Writing Editor', 'Study Notes'] as const;
type TaskTab = (typeof taskTabs)[number];

const baseContent: Record<TaskTab, string> = {
  'Coding Editor': '// Define today\'s objective\n// 1. Input:\n// 2. First executable operation:\n\n',
  'Writing Editor': 'Title:\nClaim:\nFirst sentence:\n\n',
  'Study Notes': `Neural Load Notes\n\n- Friction rises when interpretation is unconstrained.\n- A single executable action reduces ambiguity.\n- Early delay predicts disengagement under cognitive uncertainty.\n\nScroll to inspect notes.\n`
};

const interventions: Record<FrictionType, { title: string; action: string }> = {
  none: { title: 'No active friction detected', action: 'Monitoring active execution signals.' },
  unclear_start: { title: 'Providing a starter structure', action: 'Seeded a minimal starting frame in editor.' },
  overwhelm: { title: 'Breaking into first executable step', action: 'Step 1: write one executable line only.' },
  decision_block: { title: 'Reducing choice space', action: 'Only one allowed next action is now displayed.' },
  difficulty_shock: { title: 'Simplifying entry point', action: 'Active material replaced with reduced-complexity form.' },
  avoidance_loop: { title: 'Initiating micro-start (20 seconds)', action: 'Micro-start overlay is enforcing immediate initiation.' }
};

const frictionPriority: FrictionType[] = [
  'unclear_start',
  'avoidance_loop',
  'difficulty_shock',
  'decision_block',
  'overwhelm'
];

export default function WorkspacePage() {
  const [activeTab, setActiveTab] = useState<TaskTab>('Coding Editor');
  const [contentByTab, setContentByTab] = useState<Record<TaskTab, string>>(baseContent);
  const [session, setSession] = useState<SessionData>(emptySession);
  const [overlaySeconds, setOverlaySeconds] = useState(0);
  const [injected, setInjected] = useState<Record<FrictionType, boolean>>({
    none: false,
    unclear_start: false,
    overwhelm: false,
    decision_block: false,
    difficulty_shock: false,
    avoidance_loop: false
  });

  const previousText = useRef(baseContent['Coding Editor']);
  const lastInputAtRef = useRef<number | null>(null);
  const lastPauseLoggedAtRef = useRef(0);
  const scrollHitsRef = useRef<number[]>([]);

  const editorText = contentByTab[activeTab];

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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }, [session]);

  useEffect(() => {
    previousText.current = editorText;
  }, [editorText]);

  const updateActiveText = (updater: (text: string) => string) => {
    setContentByTab((current) => ({ ...current, [activeTab]: updater(current[activeTab]) }));
  };

  const applyIntervention = (type: FrictionType) => {
    if (injected[type] || type === 'none') return;

    setInjected((current) => ({ ...current, [type]: true }));

    if (type === 'unclear_start') {
      updateActiveText((t) => `${t}\nStarter:\n- Objective:\n- First operation:\n`);
    }
    if (type === 'overwhelm') {
      updateActiveText((t) => `${t}\n\nStep 1: Write one executable sentence.`);
    }
    if (type === 'decision_block') {
      updateActiveText(() => 'Next action only:\nWrite one line that starts the task.');
    }
    if (type === 'difficulty_shock') {
      updateActiveText(() => 'Simplified example:\nInput -> single transformation -> output.');
    }
    if (type === 'avoidance_loop') {
      setOverlaySeconds(20);
    }

    setSession((current) => ({
      ...current,
      events: [...current.events, { t: Date.now() - current.startedAt, type: 'intervention', value: type }]
    }));
  };

  const classifyFriction = (current: SessionData, now: number): FrictionType => {
    const elapsed = now - current.startedAt;
    const sinceInput = lastInputAtRef.current ? now - lastInputAtRef.current : elapsed;

    const flags: Record<FrictionType, boolean> = {
      none: false,
      unclear_start: current.firstKeystrokeAt === null && elapsed >= 35000,
      overwhelm: current.firstKeystrokeAt !== null && sinceInput >= 18000,
      difficulty_shock: current.deletes >= 18,
      avoidance_loop: current.tabSwitches > 5,
      decision_block: scrollHitsRef.current.length >= 7
    };

    return frictionPriority.find((type) => flags[type]) ?? 'none';
  };

  useEffect(() => {
    const detector = setInterval(() => {
      const now = Date.now();

      setSession((current) => {
        const nextFriction = classifyFriction(current, now);

        const base: SessionData = {
          ...current,
          currentFriction: nextFriction,
          actionDelay: current.firstKeystrokeAt ? current.firstKeystrokeAt - current.startedAt : now - current.startedAt
        };

        const pauseDuration = lastInputAtRef.current ? now - lastInputAtRef.current : 0;
        const shouldLogPause =
          current.firstKeystrokeAt !== null && pauseDuration >= 3000 && now - lastPauseLoggedAtRef.current >= 3000;

        const withPause = shouldLogPause
          ? {
              ...base,
              pauseDurations: [...base.pauseDurations, pauseDuration],
              events: [...base.events, { t: now - base.startedAt, type: 'pause', value: Math.round(pauseDuration / 1000) }]
            }
          : base;

        if (shouldLogPause) {
          lastPauseLoggedAtRef.current = now;
        }

        if (nextFriction !== current.currentFriction) {
          setTimeout(() => applyIntervention(nextFriction), 0);

          return {
            ...withPause,
            frictionHistory: [...withPause.frictionHistory, nextFriction],
            events: [...withPause.events, { t: now - withPause.startedAt, type: 'friction_change', value: nextFriction }]
          };
        }

        return withPause;
      });
    }, 1000);

    return () => clearInterval(detector);
  }, [injected]);

  useEffect(() => {
    if (overlaySeconds <= 0) return;
    const id = setInterval(() => setOverlaySeconds((s) => Math.max(s - 1, 0)), 1000);
    return () => clearInterval(id);
  }, [overlaySeconds]);

  const onTabSwitch = (tab: TaskTab) => {
    setActiveTab(tab);
    setSession((current) => ({
      ...current,
      tabSwitches: current.tabSwitches + 1,
      events: [...current.events, { t: Date.now() - current.startedAt, type: 'tab_switch', value: current.tabSwitches + 1 }]
    }));
  };

  const onTextChange = (next: string) => {
    const now = Date.now();
    const prev = previousText.current;
    const delta = next.length - prev.length;
    const deleted = delta < 0 ? Math.abs(delta) : 0;

    setContentByTab((current) => ({ ...current, [activeTab]: next }));
    previousText.current = next;
    lastInputAtRef.current = now;

    setSession((current) => {
      const pause = lastPauseLoggedAtRef.current === 0 ? 0 : now - lastPauseLoggedAtRef.current;
      return {
        ...current,
        firstKeystrokeAt: current.firstKeystrokeAt ?? now,
        typingBursts: [...current.typingBursts, Math.max(delta, 0)],
        pauseDurations: pause > 3000 ? [...current.pauseDurations, pause] : current.pauseDurations,
        deletes: current.deletes + deleted,
        events: [...current.events, { t: now - current.startedAt, type: deleted > 0 ? 'delete' : 'keystroke', value: Math.abs(delta) }]
      };
    });
  };

  const onScroll = () => {
    const now = Date.now();
    scrollHitsRef.current = [...scrollHitsRef.current.filter((t) => now - t <= 15000), now];

    setSession((current) => ({
      ...current,
      scrolls: current.scrolls + 1,
      events: [...current.events, { t: now - current.startedAt, type: 'scroll', value: scrollHitsRef.current.length }]
    }));
  };

  const resetSession = () => {
    const fresh = emptySession();
    setSession(fresh);
    lastInputAtRef.current = null;
    lastPauseLoggedAtRef.current = 0;
    scrollHitsRef.current = [];
    setOverlaySeconds(0);
    setInjected({
      none: false,
      unclear_start: false,
      overwhelm: false,
      decision_block: false,
      difficulty_shock: false,
      avoidance_loop: false
    });
    setContentByTab(baseContent);
    setActiveTab('Coding Editor');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  };

  const typingSpeed = useMemo(() => {
    if (!session.firstKeystrokeAt || !lastInputAtRef.current) return 0;
    const totalChars = session.typingBursts.reduce((a, b) => a + b, 0);
    const minutes = Math.max((lastInputAtRef.current - session.firstKeystrokeAt) / 60000, 1 / 60);
    return Math.round(totalChars / minutes);
  }, [session.firstKeystrokeAt, session.typingBursts]);

  return (
    <main className="min-h-screen p-5 lg:p-8">
      <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[240px_1fr_320px]">
        <aside className="panel rounded-sm p-4">
          <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-instrument-muted">Task Selector</h2>
          <div className="space-y-2">
            {taskTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => onTabSwitch(tab)}
                className={`w-full border px-3 py-2 text-left text-sm ${
                  activeTab === tab ? 'border-instrument-ink bg-white' : 'border-instrument-line text-instrument-muted'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <button
            onClick={resetSession}
            className="mt-6 w-full border border-instrument-line px-3 py-2 text-xs uppercase tracking-[0.12em] text-instrument-muted"
          >
            Reset Session
          </button>

          <Link href="/report" className="mt-4 inline-block text-xs uppercase tracking-[0.15em] text-instrument-accent underline">
            End Session Report
          </Link>
        </aside>

        <section className="panel relative rounded-sm p-4">
          <p className="mb-3 text-xs uppercase tracking-[0.2em] text-instrument-muted">Working Environment</p>
          {activeTab === 'Study Notes' ? (
            <div onScroll={onScroll} className="h-[70vh] overflow-y-auto whitespace-pre-wrap border border-instrument-line p-4 text-sm">
              {editorText.repeat(6)}
            </div>
          ) : (
            <textarea
              value={editorText}
              onChange={(e) => onTextChange(e.target.value)}
              onScroll={onScroll}
              className="h-[70vh] w-full resize-none border border-instrument-line bg-[#0f172a] p-4 font-mono text-sm text-[#e5e7eb] outline-none"
              spellCheck={false}
            />
          )}

          {overlaySeconds > 0 && (
            <div className="absolute inset-0 grid place-items-center bg-[#111827]/80 text-white">
              <div className="border border-white/50 px-6 py-4 text-center">
                <p className="text-xs uppercase tracking-[0.2em]">Micro-start Window</p>
                <p className="mt-2 text-4xl font-semibold">{overlaySeconds}s</p>
              </div>
            </div>
          )}
        </section>

        <aside className="panel rounded-sm p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-instrument-muted">Live Cognitive Monitor</p>
          <div className="mt-4 space-y-3 text-sm">
            <div className="border border-instrument-line p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-instrument-muted">Current Classification</p>
              <p className="mt-1 font-medium">{session.currentFriction.replace('_', ' ')}</p>
            </div>
            <div className="border border-instrument-line p-3 text-instrument-muted">
              <p>{interventions[session.currentFriction].title}</p>
              <p className="mt-1 text-xs">{interventions[session.currentFriction].action}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Metric label="Action delay" value={`${Math.floor(session.actionDelay / 1000)}s`} />
              <Metric label="Typing speed" value={`${typingSpeed} cpm`} />
              <Metric label="Pauses" value={`${session.pauseDurations.length}`} />
              <Metric label="Rapid deletion" value={`${session.deletes}`} />
              <Metric label="Tab switches" value={`${session.tabSwitches}`} />
              <Metric label="Scroll loops" value={`${scrollHitsRef.current.length}`} />
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-instrument-line p-2">
      <p className="text-[10px] uppercase tracking-[0.12em] text-instrument-muted">{label}</p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}
