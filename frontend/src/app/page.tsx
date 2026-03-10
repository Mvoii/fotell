import { redirect } from "next/navigation";

/**
 * Root route `/` — redirects to the public Markets list.
 * The full Landing Page (hero, stats, how-it-works) will be built
 * in the feat/landing-page branch.
 */
export default function RootPage() {
  redirect("/markets");
}
