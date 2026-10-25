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

/** Lock-screen passcode: dots, a phone keypad, submits on the last digit. */
export function PasscodeForm({ length, next }: { length: number; next: string }) {
  const [code, setCode] = useState("");
  const [state, dispatch, pending] = useActionState<LoginState, FormData>(login, null);
  const [lockedFor, setLockedFor] = useState(0);
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
    navigator.vibrate?.(200);
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

  function press(digit: string) {
    if (disabled || code.length >= length) return;
    const nextCode = code + digit;
    setCode(nextCode);
    if (nextCode.length === length) {
      const formData = new FormData();
      formData.set("passcode", nextCode);
      formData.set("next", next);
      startTransition(() => dispatch(formData));
    }
  }

  function erase() {
    if (!disabled) setCode((c) => c.slice(0, -1));
  }

  // Hardware keyboard: digits and Backspace.
  const pressRef = useRef(press);
  const eraseRef = useRef(erase);
  useEffect(() => {
    pressRef.current = press;
    eraseRef.current = erase;
  });
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^\d$/.test(e.key)) pressRef.current(e.key);
      else if (e.key === "Backspace") eraseRef.current();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const status = locked
    ? `Try again in ${clock(lockedFor)}`
    : state && !pending
      ? state.error
      : "";

  const key =
    "btn flex h-[4.75rem] w-[4.75rem] flex-col items-center justify-center rounded-full bg-surface-muted text-foreground hover:bg-gridline active:bg-gridline disabled:opacity-40 sm:h-20 sm:w-20";

  return (
    <div className="mx-auto flex min-h-full w-full max-w-xs flex-col items-center justify-center gap-8 px-4 py-10">
      <div className="flex flex-col items-center gap-3">
        <SheepMark className="h-12 w-12 text-primary" />
        <h1 className="text-xl font-medium text-foreground">Enter Passcode</h1>
      </div>

      <div className="flex flex-col items-center gap-3">
        <div
          ref={shakeRef}
          role="img"
          aria-label={`${code.length} of ${length} digits entered`}
          className={`flex gap-5 ${pending ? "animate-pulse" : ""}`}
        >
          {Array.from({ length }, (_, i) => (
            <span
              key={i}
              className={`h-3.5 w-3.5 rounded-full border-[1.5px] border-foreground transition-colors duration-100 ${
                i < code.length ? "bg-foreground" : "bg-transparent"
              }`}
            />
          ))}
        </div>
        <p aria-live="polite" className="min-h-5 text-sm text-critical">
          {status}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-x-6 gap-y-4">
        {KEYS.map(({ digit, letters }) => (
          <button key={digit} type="button" disabled={locked} onClick={() => press(digit)} className={key}>
            <span className="text-3xl leading-none font-light">{digit}</span>
            <span className="mt-0.5 h-3 text-[0.6rem] font-semibold tracking-[0.2em] text-ink-muted" aria-hidden="true">
              {letters}
            </span>
          </button>
        ))}
        <span aria-hidden="true" />
        <button type="button" disabled={locked} onClick={() => press("0")} className={key}>
          <span className="text-3xl leading-none font-light">0</span>
        </button>
        <button
          type="button"
          onClick={erase}
          disabled={disabled || code.length === 0}
          aria-label="Delete"
          className="btn flex h-[4.75rem] w-[4.75rem] items-center justify-center rounded-full text-foreground disabled:opacity-0 sm:h-20 sm:w-20"
        >
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="M9 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6-7 6-7Z" strokeLinejoin="round" />
            <path d="m12 9.5 5 5m0-5-5 5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
