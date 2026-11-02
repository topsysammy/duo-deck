import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/account/delete — deletes the caller's account (ON-5).
 * Auth: `Authorization: Bearer <access token>` of the user being deleted.
 * Deleting the auth user cascades to profiles, favorites and sessions
 * (see supabase/migrations), so data is gone immediately.
 * The service-role key lives only on the server (never NEXT_PUBLIC_).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (status: number, body: Record<string, unknown>) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/(rest|auth)\/v1\/?$/, "").replace(/\/+$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return json(503, { error: "Accounts are not configured" });

  const token = /^Bearer (.+)$/.exec(req.headers.get("authorization") ?? "")?.[1];
  if (!token) return json(401, { error: "Missing access token" });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return json(401, { error: "Invalid or expired session" });

  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id);
  if (deleteError) {
    console.error("Account deletion failed", deleteError.message);
    return json(500, { error: "Could not delete the account. Please try again." });
  }
  return json(200, { deleted: true });
}
