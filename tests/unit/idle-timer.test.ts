import { describe, expect, it, vi } from "vitest";
import { createIdleTimer } from "@/case/idle-timer";

const MIN = 60_000;

function setup() {
  let clock = 0;
  const onWarn = vi.fn();
  const onExpire = vi.fn();
  const timer = createIdleTimer({ timeoutMs: 30 * MIN, warningMs: 5 * MIN, now: () => clock, onWarn, onExpire });
  const advance = (ms: number) => {
    clock += ms;
    timer.tick();
  };
  return { timer, advance, onWarn, onExpire };
}

describe("clinical idle timer", () => {
  it("warns five minutes before expiry and expires after thirty minutes without activity", () => {
    const { advance, onWarn, onExpire } = setup();
    advance(24 * MIN);
    expect(onWarn).not.toHaveBeenCalled();
    advance(1 * MIN);
    expect(onWarn).toHaveBeenCalledWith(5 * MIN);
    advance(4 * MIN);
    expect(onExpire).not.toHaveBeenCalled();
    advance(1 * MIN);
    expect(onExpire).toHaveBeenCalledTimes(1);
    advance(10 * MIN);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("only user activity resets the countdown", () => {
    const { timer, advance, onWarn, onExpire } = setup();
    advance(25 * MIN);
    expect(onWarn).toHaveBeenCalledTimes(1);
    timer.touch();
    advance(25 * MIN);
    expect(onWarn).toHaveBeenCalledTimes(2);
    expect(onExpire).not.toHaveBeenCalled();
    expect(timer.remainingMs()).toBe(5 * MIN);
  });

  it("pauses while a clinical call is in flight and does not count that time", () => {
    const { timer, advance, onExpire } = setup();
    advance(20 * MIN);
    timer.pause();
    advance(60 * MIN);
    expect(onExpire).not.toHaveBeenCalled();
    timer.resume();
    expect(timer.remainingMs()).toBe(10 * MIN);
    advance(10 * MIN);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });
});
