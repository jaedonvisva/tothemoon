import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

/**
 * Supabase Auth session refresh for SSR. Moonshot `/game` is excluded: that flow uses Privy + the Bun API only.
 * Do not assume a Supabase user id matches `User.id` in the Bun API (those rows use Privy user ids).
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

// Skip Supabase session refresh for `/game` — Moonshot uses Privy + Bun API only on that route.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|game|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
