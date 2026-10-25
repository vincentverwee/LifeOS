"use client";

// Replaces the root layout when that itself fails, so no globals.css here: inline styles only.
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 24, textAlign: "center" }}>
        <title>Something went wrong · Life Analytics</title>
        <h1 style={{ fontSize: 20 }}>Something went wrong</h1>
        <p style={{ color: "#898781" }}>The app couldn&apos;t load.</p>
        <button
          type="button"
          onClick={() => retry()}
          style={{ marginTop: 12, padding: "10px 20px", borderRadius: 999, border: 0, background: "#1f5c3b", color: "#fff" }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
