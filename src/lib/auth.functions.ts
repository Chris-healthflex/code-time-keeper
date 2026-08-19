import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Called after Supabase OAuth/password auth. Determines where to send the user:
 *   "admin"     → /admin  (user_roles row with role=admin)
 *   "candidate" → /a/:token  (email found in candidates table, fresh link generated)
 *   "none"      → not invited
 *
 * Bootstrap: if user_roles is completely empty the first authenticated user
 * is granted admin automatically (one-time only).
 */
export const resolveAuthDestination = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;
    // Supabase access tokens include email as a standard claim
    const email = ((context.claims as Record<string, unknown>)["email"] as string | undefined)?.toLowerCase() ?? null;

    // ── 1. Check if this user already has the admin role ──────────────────
    const { data: roleRow } = await (context.supabase as any)
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleRow) return { destination: "admin" as const, path: "/admin/dashboard" };

    // ── 1b. Bootstrap: grant admin to the very first authenticated user ────
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true });

    if ((count ?? 0) === 0) {
      await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: userId, role: "admin" });
      return { destination: "admin" as const, path: "/admin/dashboard" };
    }

    // ── 2. Check if this email is an invited candidate ─────────────────────
    if (email) {
      const { data: candidate } = await supabaseAdmin
        .from("candidates")
        .select("id, assignment_id, token_id, email")
        .eq("email", email)
        .eq("revoked", false)
        .not("status", "eq", "expired")
        .maybeSingle();

      if (candidate) {
        const { signLink } = await import("./link-token.server");
        const token = await signLink({
          cid: candidate.id,
          aid: candidate.assignment_id,
          email: candidate.email as string,
          jti: candidate.token_id as string,
        });
        return { destination: "candidate" as const, path: `/a/${token}` };
      }
    }

    return { destination: "none" as const, path: null, email };
  });
