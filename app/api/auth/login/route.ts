import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function loginRedirect(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url), { status: 303 });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return loginRedirect(request, "/login?error=Email%20and%20password%20are%20required.");
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return loginRedirect(request, "/login?error=Supabase%20is%20not%20configured.");
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return loginRedirect(request, `/login?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  return loginRedirect(request, "/dashboard");
}
