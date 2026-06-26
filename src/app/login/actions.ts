"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export async function sendMagicLink(email: string) {
  if (!email) {
    return { error: "Email is required" };
  }

  const allowedEmail = process.env.ALLOWED_EMAIL;
  if (!allowedEmail) {
    return { error: "Login is currently misconfigured: ALLOWED_EMAIL env variable not set." };
  }

  if (email.toLowerCase().trim() !== allowedEmail.toLowerCase().trim()) {
    return { error: "Access Denied: Your email is not on the allowed list." };
  }

  const supabase = await createClient();
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
  const redirectUrl = `${protocol}://${host}/auth/callback`;

  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: {
      emailRedirectTo: redirectUrl,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
