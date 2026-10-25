"use client";

import { useActionState, useEffect, useRef, useState, startTransition } from "react";
import { login, type LoginState } from "@/lib/actions/auth";
import { SheepMark } from "@/components/icons/SheepMark";

const KEYS: { digit: string; letters: string }[] = [
  { digit: "1", letters: "" },
  { digit: "2", letters: "ABC" },
  { digit: "3", letters: "DEF" },
  { digit: "4", letters: "GHI" },
  { digit: "5", letters: "JKL" },
  { digit: "6", letters: "MNO" },
  { digit: "7", letters: "PQRS" },
  { digit: "8", letters: "TUV" },
  { digit: "9", letters: "WXYZ" },
];

/** "0:30" */
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/** A tiny tick on Android (iOS Safari has no vibration API; it simply does nothing). */
const tick = (ms = 8) => navigator.vibrate?.(ms);

/** Lock-screen passcode: dots, a phone keypad, submits on the last digit. */
export function PasscodeForm({ length, next }: { length: number; next: string }) {
  const [code, setCode] = useState("");
  // The latest code without waiting for a re-render, so two very fast taps both count.
  const codeRef = useRef("");
  const [state, dispatch, pending] = useActionState<LoginState, FormData>(login, null);
  const [lockedFor, setLockedFor] = useState(0);
  // The key that was just hit (touch or keyboard), lit up briefly like on iOS.
  const [flash, setFlash] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shakeRef = useRef<HTMLDivElement>(null);

  // A failed try: clear the dots, shake them, buzz, and start the lockout countdown if any.
  const [handledAttempt, setHandledAttempt] = useState(0);
  if (state && state.attempt !== handledAttempt) {
    setHandledAttempt(state.attempt);
    setCode("");
    setLockedFor(state.retryAfter ?? 0);
  }
  useEffect(() => {
    if (!state) return;
    codeRef.current = "";
    tick(200);
    const dots = shakeRef.current;
    dots?.classList.remove("animate-shake");
    void dots?.offsetWidth; // restart the animation on every failure
    dots?.classList.add("animate-shake");
  }, [state]);

  useEffect(() => {
    if (lockedFor <= 0) return;
    const timer = setTimeout(() => setLockedFor((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [lockedFor]);

  const locked = lockedFor > 0;
  const disabled = pending || locked;
  const full = code.length === length;

  function light(key: string) {
    setFlash(key);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 150);
  }

  function press(digit: string) {
    if (disabled || codeRef.current.length >= length) return;
    light(digit);
    tick();
    const nextCode = codeRef.current + digit;
    codeRef.current = nextCode;
    setCode(nextCode);
    if (nextCode.length === length) {
      const formData = new FormData();
      formData.set("passcode", nextCode);
      formData.set("next", next);
      startTransition(() => dispatch(formData));
    }
  }

  function erase(all = false) {
    if (disabled || !codeRef.current) return;
    light("delete");
    tick();
    codeRef.current = all ? "" : codeRef.current.slice(0, -1);
    setCode(codeRef.current);
  }

  // Hardware keyboard: digits, Backspace, Escape (clear).
  const pressRef = useRef(press);
  const eraseRef = useRef(erase);
  useEffect(() => {
    pressRef.current = press;
    eraseRef.current = erase;
  });
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      if (/^\d$/.test(e.key)) pressRef.current(e.key);
      else if (e.key === "Backspace") eraseRef.current();
      else if (e.key === "Escape") eraseRef.current(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const status = locked
    ? `Try again in ${clock(lockedFor)}`
    : pending && full
      ? "Checking…"
      : state
        ? state.error
        : "";

  const keyClass = (id: string) =>
    `flex h-[4.75rem] w-[4.75rem] touch-manipulation select-none flex-col items-center justify-center rounded-full text-foreground transition-[background-color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 sm:h-20 sm:w-20 ${
      flash === id ? "scale-95 bg-ink-muted/45 duration-0" : "bg-surface-muted duration-300 hover:bg-gridline"
    }`;

  return (
    <div className="mx-auto flex min-h-full w-full max-w-xs flex-col items-center justify-center gap-8 px-4 py-10">
      <div className="flex flex-col items-center gap-3">
        <SheepMark className={`h-12 w-12 text-primary transition-transform duration-300 ${pending && full ? "scale-110" : ""}`} />
        <h1 className="text-xl font-medium text-foreground">{locked ? "Locked" : "Enter Passcode"}</h1>
      </div>

      <div className="flex flex-col items-center gap-3">
        <div
          ref={shakeRef}
          role="img"
          aria-label={`${code.length} of ${length} digits entered`}
          className={`flex gap-5 ${pending && full ? "animate-pulse" : ""}`}
        >
          {Array.from({ length }, (_, i) => {
            const filled = i < code.length;
            return (
              <span
                // Remounted when it fills, so the pop animation plays for each digit.
                key={`${i}-${filled}`}
                className={`h-3.5 w-3.5 rounded-full border-[1.5px] ${
                  filled
                    ? `animate-dot-pop ${pending && full ? "border-primary bg-primary" : "border-foreground bg-foreground"}`
                    : "border-foreground bg-transparent"
                }`}
              />
            );
          })}
        </div>
        <p
          aria-live="polite"
          className={`min-h-5 text-sm transition-colors ${pending && full ? "text-ink-muted" : "text-critical"}`}
        >
          {status}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-x-6 gap-y-4">
        {KEYS.map(({ digit, letters }) => (
          <Key key={digit} disabled={locked} onPress={() => press(digit)} className={keyClass(digit)}>
            <span className="text-3xl leading-none font-light">{digit}</span>
            <span className="mt-0.5 h-3 text-[0.6rem] font-semibold tracking-[0.2em] text-ink-muted" aria-hidden="true">
              {letters}
            </span>
          </Key>
        ))}
        <span aria-hidden="true" />
        <Key disabled={locked} onPress={() => press("0")} className={keyClass("0")}>
          <span className="text-3xl leading-none font-light">0</span>
        </Key>
        <Key
          onPress={() => erase()}
          disabled={disabled || code.length === 0}
          aria-label="Delete"
          className={`flex h-[4.75rem] w-[4.75rem] touch-manipulation select-none items-center justify-center rounded-full text-foreground transition-[opacity,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-0 sm:h-20 sm:w-20 ${
            flash === "delete" ? "scale-90 opacity-60" : ""
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="M9 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6-7 6-7Z" strokeLinejoin="round" />
            <path d="m12 9.5 5 5m0-5-5 5" strokeLinecap="round" />
          </svg>
        </Key>
      </div>
    </div>
  );
}

/**
 * A keypad key that acts on touch-down, not on release (that's what makes the iOS keypad
 * feel instant). onClick only handles keyboard activation of a focused key (Enter/Space).
 */
function Key({
  onPress,
  ...props
}: { onPress: () => void } & Omit<React.ComponentProps<"button">, "onClick" | "onPointerDown" | "type">) {
  return (
    <button
      type="button"
      {...props}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault(); // no focus ring or text selection on tap
        onPress();
      }}
      onClick={(e) => {
        if (e.detail === 0) onPress();
      }}
    />
  );
}
