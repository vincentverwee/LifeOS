import type { Metadata } from "next";
import { PasscodeForm } from "@/components/LoginForm";

export const metadata: Metadata = { title: "Log in · Life Analytics" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const passcode = process.env.APP_PASSWORD ?? "";
  const configured = /^\d{4,8}$/.test(passcode);

  return (
    // Full-screen over the app header, like a lock screen.
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {configured ? (
        <PasscodeForm length={passcode.length} next={typeof next === "string" ? next : "/"} />
      ) : (
        <p className="mx-auto max-w-xs pt-24 text-center text-sm text-ink-muted">
          The passcode isn&apos;t set up. Set <code className="font-mono">APP_PASSWORD</code> to 4–8 digits on the
          server.
        </p>
      )}
    </div>
  );
}
