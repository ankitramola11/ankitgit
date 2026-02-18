export type FrictionType =
  | 'none'
  | 'unclear_start'
  | 'overwhelm'
  | 'difficulty_shock'
  | 'avoidance_loop'
  | 'decision_block';

export type EventType =
  | 'keystroke'
  | 'pause'
  | 'delete'
  | 'scroll'
  | 'tab_switch'
  | 'intervention'
  | 'friction_change'
  | 'start';

export interface SessionEvent {
  t: number;
  type: EventType;
  value?: number | string;
}

export interface SessionData {
  startedAt: number;
  firstKeystrokeAt: number | null;
  typingBursts: number[];
  pauseDurations: number[];
  deletes: number;
  scrolls: number;
  tabSwitches: number;
  currentFriction: FrictionType;
  frictionHistory: FrictionType[];
  events: SessionEvent[];
  actionDelay: number;
}

export const emptySession = (): SessionData => ({
  startedAt: Date.now(),
  firstKeystrokeAt: null,
  typingBursts: [],
  pauseDurations: [],
  deletes: 0,
  scrolls: 0,
  tabSwitches: 0,
  currentFriction: 'none',
  frictionHistory: [],
  events: [{ t: 0, type: 'start' }],
  actionDelay: 0
});

export const STORAGE_KEY = 'life-friction-analyzer-session';

export const normalizeSession = (value: unknown): SessionData => {
  if (!value || typeof value !== 'object') {
    return emptySession();
  }

  const v = value as Partial<SessionData>;
  return {
    startedAt: v.startedAt ?? Date.now(),
    firstKeystrokeAt: v.firstKeystrokeAt ?? null,
    typingBursts: Array.isArray(v.typingBursts) ? v.typingBursts : [],
    pauseDurations: Array.isArray(v.pauseDurations) ? v.pauseDurations : [],
    deletes: v.deletes ?? 0,
    scrolls: v.scrolls ?? 0,
    tabSwitches: v.tabSwitches ?? 0,
    currentFriction: v.currentFriction ?? 'none',
    frictionHistory: Array.isArray(v.frictionHistory) ? v.frictionHistory : [],
    events: Array.isArray(v.events) ? v.events : [{ t: 0, type: 'start' }],
    actionDelay: v.actionDelay ?? 0
  };
};
