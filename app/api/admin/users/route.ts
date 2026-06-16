import { NextResponse } from "next/server";
import { adminUserCreateSchema } from "@/lib/validation/import";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireEntityContext, safeAudit } from "@/lib/db/server-helpers";

export async function POST(request: Request) {
  const payload = adminUserCreateSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.issues[0]?.message ?? "Invalid user payload." }, { status: 400 });
  }

  const contextResult = await requireEntityContext(payload.data.entityId);
  if ("error" in contextResult) {
    return NextResponse.json({ error: contextResult.error }, { status: contextResult.status });
  }

  const { context } = contextResult;
  if (context.role !== "owner" && context.role !== "admin") {
    return NextResponse.json({ error: "Only owner and admin roles can create or invite users." }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is required on the server to create or invite users." }, { status: 503 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const temporaryPassword = payload.data.temporaryPassword?.trim();
  const userMetadata = {
    full_name: payload.data.fullName,
    title: payload.data.title ?? null
  };
  const appMetadata = {
    sios_rls_role: payload.data.role,
    provider: "email",
    providers: ["email"]
  };

  const authResponse = temporaryPassword
    ? await admin.auth.admin.createUser({
        email: payload.data.email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: userMetadata,
        app_metadata: appMetadata
      })
    : await admin.auth.admin.inviteUserByEmail(payload.data.email, {
        data: userMetadata,
        redirectTo: `${appUrl}/accept-invite`
      });

  if (authResponse.error) {
    return NextResponse.json({ error: authResponse.error.message }, { status: 500 });
  }

  const authUser = authResponse.data.user;
  if (!authUser) {
    return NextResponse.json({ error: "Supabase did not return an auth user." }, { status: 500 });
  }

  const profilePayload = {
    id: authUser.id,
    auth_user_id: authUser.id,
    email: payload.data.email.toLowerCase(),
    full_name: payload.data.fullName,
    title: payload.data.title ?? null,
    default_entity_id: payload.data.entityId,
    status: "active",
    updated_at: new Date().toISOString()
  };

  const { error: profileError } = await admin.from("profiles").upsert(profilePayload, { onConflict: "id" });
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  await admin
    .from("user_entity_roles")
    .delete()
    .eq("user_id", authUser.id)
    .eq("entity_id", payload.data.entityId);

  const { error: roleError } = await admin.from("user_entity_roles").insert({
    user_id: authUser.id,
    entity_id: payload.data.entityId,
    role: payload.data.role,
    created_by: context.profileId
  });
  if (roleError) {
    return NextResponse.json({ error: roleError.message }, { status: 500 });
  }

  await safeAudit({
    entityId: payload.data.entityId,
    profileId: context.profileId,
    eventType: temporaryPassword ? "admin.user_created" : "admin.user_invited",
    resourceType: "profiles",
    resourceId: authUser.id,
    afterState: { email: payload.data.email, full_name: payload.data.fullName, role: payload.data.role },
    metadata: { temporary_password_used: Boolean(temporaryPassword) }
  });

  return NextResponse.json({
    userId: authUser.id,
    email: payload.data.email,
    role: payload.data.role,
    temporaryPasswordUsed: Boolean(temporaryPassword)
  });
}
