import { Brain, HeartPulse, Users, type LucideIcon } from "lucide-react";
import type { HabitGroup } from "@/lib/reminders/habits";

/** Per habit group: its icon, text colour and bar fill (To do card + Insights). */
export const GROUP_STYLE: Record<HabitGroup, { icon: LucideIcon; color: string; bar: string }> = {
  body: { icon: HeartPulse, color: "text-tag-green", bar: "bg-tag-green" },
  mind: { icon: Brain, color: "text-tag-blue", bar: "bg-tag-blue" },
  connection: { icon: Users, color: "text-tag-violet", bar: "bg-tag-violet" },
};
