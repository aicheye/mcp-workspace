/**
 * Public auth routes for the onboarding page.
 * No JWT required — these handle signup/signin and return tokens.
 */

import { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";

const router = Router();

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  // Use anon key for user auth — service role key issues short-lived tokens
  const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase not configured");
  return createClient(url, key);
}

/** POST /auth/signup */
router.post("/signup", async (req: Request, res: Response) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) { res.status(400).json({ error: error.message }); return; }
    res.json({
      token: data.session?.access_token,
      refreshToken: data.session?.refresh_token,
      expiresAt: data.session?.expires_at,
      userId: data.user?.id,
      needsConfirmation: !data.session,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/** POST /auth/signin */
router.post("/signin", async (req: Request, res: Response) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { res.status(400).json({ error: error.message }); return; }
    res.json({
      token: data.session?.access_token,
      refreshToken: data.session?.refresh_token,
      expiresAt: data.session?.expires_at,
      userId: data.user?.id,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/** POST /auth/refresh — exchange refresh_token for a new access_token */
router.post("/refresh", async (req: Request, res: Response) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) {
    res.status(400).json({ error: "refreshToken required" });
    return;
  }
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
    if (error) { res.status(401).json({ error: error.message }); return; }
    res.json({
      token: data.session?.access_token,
      refreshToken: data.session?.refresh_token,
      expiresAt: data.session?.expires_at,
      userId: data.user?.id,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/** POST /auth/forgot-password — send password reset email */
router.post("/forgot-password", async (req: Request, res: Response) => {
  const { email, redirectTo } = req.body || {};
  if (!email) {
    res.status(400).json({ error: "Email required" });
    return;
  }
  try {
    const supabase = getSupabase();
    const forwardedProto = (req.headers["x-forwarded-proto"] as string | undefined) || "https";
    const host = req.headers.host;
    const origin = req.headers.origin as string | undefined;
    const fallbackBase = process.env.API_HOST ? `https://${process.env.API_HOST}` : "";
    const inferredBase = origin || (host ? `${forwardedProto}://${host}` : fallbackBase);
    const safeRedirect = (typeof redirectTo === "string" && redirectTo.trim()) || `${inferredBase}/onboard`;

    // Always return 200 to avoid account enumeration leakage.
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: safeRedirect });
    if (error) {
      console.error("[AUTH] forgot-password error:", error.message);
    }
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/** POST /auth/reset-password — complete password recovery with tokens from email link */
router.post("/reset-password", async (req: Request, res: Response) => {
  const { accessToken, refreshToken, password } = req.body || {};
  if (!accessToken || !refreshToken || !password) {
    res.status(400).json({ error: "accessToken, refreshToken, and password required" });
    return;
  }
  if (typeof password !== "string" || password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }
  try {
    const supabase = getSupabase();
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (sessionError) {
      res.status(400).json({ error: sessionError.message });
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      res.status(400).json({ error: updateError.message });
      return;
    }
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
