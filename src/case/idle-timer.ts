// Clinical-session idle timer: only user activity resets it, clinical calls
// pause it, and expiry clears the tab. Pure so it can run on a fake clock.

export type IdleTimerOptions = {
  timeoutMs: number;
  warningMs: number;
  now?: () => number;
  onWarn: (remainingMs: number) => void;
  onExpire: () => void;
};

export type IdleTimer = {
  touch(): void; // user activity
  pause(): void; // a clinical call is in flight
  resume(): void;
  tick(): void; // evaluate the state against the clock
  remainingMs(): number;
  stop(): void;
};

export function createIdleTimer(options: IdleTimerOptions): IdleTimer {
  const now = options.now ?? (() => Date.now());
  let lastActivity = now();
  let pausedAt: number | null = null;
  let warned = false;
  let expired = false;

  const remainingMs = () => {
    const reference = pausedAt ?? now();
    return Math.max(0, options.timeoutMs - (reference - lastActivity));
  };

  return {
    touch() {
      if (expired) return;
      lastActivity = now();
      warned = false;
    },
    pause() {
      if (pausedAt === null) pausedAt = now();
    },
    resume() {
      if (pausedAt === null) return;
      // Time spent paused does not count as inactivity.
      lastActivity += now() - pausedAt;
      pausedAt = null;
    },
    tick() {
      if (expired || pausedAt !== null) return;
      const remaining = remainingMs();
      if (remaining <= 0) {
        expired = true;
        options.onExpire();
        return;
      }
      if (remaining <= options.warningMs && !warned) {
        warned = true;
        options.onWarn(remaining);
      }
    },
    remainingMs,
    stop() {
      expired = true;
    },
  };
}
