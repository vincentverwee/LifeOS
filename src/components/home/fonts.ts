import { Fraunces } from "next/font/google";

// Home's display serif (greeting, diary line). Loaded only where its variable is set
// (Home and /preview), so other pages keep Geist and never fetch it.
export const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz"],
});
