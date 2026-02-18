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
  | 'start';

export interface SessionEvent {
  t: number;
  type: EventType;
  value?: number;
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
  events: [{ t: 0, type: 'start' }],
  actionDelay: 0
});

export const STORAGE_KEY = 'life-friction-analyzer-session';
