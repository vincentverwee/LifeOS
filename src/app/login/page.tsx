import type { Metadata } from "next";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = { title: "Log in · Life Analytics" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-4 pt-10">
      <h1 className="text-2xl font-semibold text-foreground">Log in</h1>
      <LoginForm next={typeof next === "string" ? next : "/"} />
    </div>
  );
}
