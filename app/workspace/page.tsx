'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FrictionType, STORAGE_KEY, emptySession, type SessionData } from '../lib/session';

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
  overwhelm: { title: 'Breaking into first executable step', action: 'Step 1: create one line that defines immediate next action.' },
  decision_block: { title: 'Reducing choice space', action: 'Next action constrained to a single selectable move.' },
  difficulty_shock: { title: 'Simplifying entry point', action: 'Replaced active text with reduced-complexity example.' },
  avoidance_loop: { title: 'Initiating micro-start (20 seconds)', action: 'Micro-start overlay engaged to force narrow initiation.' }
};

export default function WorkspacePage() {
  const [activeTab, setActiveTab] = useState<TaskTab>('Coding Editor');
  const [editorText, setEditorText] = useState(baseContent['Coding Editor']);
  const [session, setSession] = useState<SessionData>(emptySession);
  const [lastInputAt, setLastInputAt] = useState<number | null>(null);
  const [overlaySeconds, setOverlaySeconds] = useState(0);
  const [injected, setInjected] = useState<Record<FrictionType, boolean>>({
    none: false,
    unclear_start: false,
    overwhelm: false,
    decision_block: false,
    difficulty_shock: false,
    avoidance_loop: false
  });
  const previousText = useRef(editorText);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as SessionData;
      setSession(parsed);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }, [session]);

  const applyIntervention = (type: FrictionType) => {
    if (injected[type] || type === 'none') return;

    setInjected((current) => ({ ...current, [type]: true }));

    if (type === 'unclear_start') {
      setEditorText((t) => `${t}\nStarter:\n- Objective:\n- First operation:\n`);
    }
    if (type === 'overwhelm') {
      setEditorText((t) => `${t}\n\nStep 1: Write one executable sentence.`);
    }
    if (type === 'decision_block') {
      setEditorText('Next action only:\nWrite one line that starts the task.');
    }
    if (type === 'difficulty_shock') {
      setEditorText('Simplified example:\nInput -> single transformation -> output.');
    }
    if (type === 'avoidance_loop') {
      setOverlaySeconds(20);
    }

    setSession((current) => ({
      ...current,
      events: [...current.events, { t: Date.now() - current.startedAt, type: 'intervention' }]
    }));
  };

  useEffect(() => {
    if (overlaySeconds <= 0) return;
    const id = setInterval(() => setOverlaySeconds((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [overlaySeconds]);

  useEffect(() => {
    const detector = setInterval(() => {
      setSession((current) => {
        const now = Date.now();
        const elapsed = now - current.startedAt;
        const sinceInput = lastInputAt ? now - lastInputAt : elapsed;
        let nextFriction: FrictionType = current.currentFriction;

        if (current.firstKeystrokeAt === null && elapsed > 35000) {
          nextFriction = 'unclear_start';
        } else if (current.tabSwitches > 5) {
          nextFriction = 'avoidance_loop';
        } else if (current.deletes >= 18) {
          nextFriction = 'difficulty_shock';
        } else if (current.scrolls >= 10) {
          nextFriction = 'decision_block';
        } else if (current.firstKeystrokeAt !== null && sinceInput > 15000) {
          nextFriction = 'overwhelm';
        }

        if (nextFriction !== current.currentFriction) {
          setTimeout(() => applyIntervention(nextFriction), 0);
        }

        return {
          ...current,
          currentFriction: nextFriction,
          actionDelay: current.firstKeystrokeAt ? current.firstKeystrokeAt - current.startedAt : elapsed
        };
      });
    }, 1000);

    return () => clearInterval(detector);
  }, [lastInputAt, injected]);

  const onTabSwitch = (tab: TaskTab) => {
    setActiveTab(tab);
    setEditorText(baseContent[tab]);
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

    setEditorText(next);
    previousText.current = next;
    setLastInputAt(now);

    setSession((current) => {
      const pause = lastInputAt ? now - lastInputAt : 0;
      return {
        ...current,
        firstKeystrokeAt: current.firstKeystrokeAt ?? now,
        typingBursts: [...current.typingBursts, Math.max(delta, 0)],
        pauseDurations: pause > 1000 ? [...current.pauseDurations, pause] : current.pauseDurations,
        deletes: current.deletes + deleted,
        events: [...current.events, { t: now - current.startedAt, type: deleted > 0 ? 'delete' : 'keystroke', value: Math.abs(delta) }]
      };
    });
  };

  const onScroll = () => {
    setSession((current) => ({
      ...current,
      scrolls: current.scrolls + 1,
      events: [...current.events, { t: Date.now() - current.startedAt, type: 'scroll', value: current.scrolls + 1 }]
    }));
  };

  const typingSpeed = useMemo(() => {
    if (!lastInputAt || !session.firstKeystrokeAt) return 0;
    const totalChars = session.typingBursts.reduce((a, b) => a + b, 0);
    const minutes = Math.max((lastInputAt - session.firstKeystrokeAt) / 60000, 1 / 60);
    return Math.round(totalChars / minutes);
  }, [lastInputAt, session.firstKeystrokeAt, session.typingBursts]);

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
          <Link href="/report" className="mt-6 inline-block text-xs uppercase tracking-[0.15em] text-instrument-accent underline">
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
              <Metric label="Scroll loops" value={`${session.scrolls}`} />
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
