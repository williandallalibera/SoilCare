import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Método não permitido." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = request.headers.get("Authorization");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse(500, { error: "Variáveis do Supabase não configuradas." });
  }

  if (!authHeader) {
    return jsonResponse(401, { error: "Autorização ausente." });
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const {
    data: { user: caller },
    error: callerError,
  } = await callerClient.auth.getUser();

  if (callerError || !caller) {
    return jsonResponse(401, { error: "Sessão inválida." });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: callerProfile, error: callerProfileError } = await adminClient
    .from("usuarios")
    .select("tenant_id, perfil_acceso, estado")
    .eq("id", caller.id)
    .maybeSingle();

  if (callerProfileError) {
    return jsonResponse(500, { error: callerProfileError.message });
  }

  if (
    !callerProfile ||
    callerProfile.estado !== "activo" ||
    callerProfile.perfil_acceso !== "admin" ||
    !callerProfile.tenant_id
  ) {
    return jsonResponse(403, { error: "Somente administradores podem redefinir senhas." });
  }

  const payload = await request.json().catch(() => null) as
    | { userId?: string; password?: string }
    | null;

  if (!payload?.userId || !payload.password) {
    return jsonResponse(400, { error: "Informe o usuário e a nova senha." });
  }

  if (payload.password.trim().length < 6) {
    return jsonResponse(400, { error: "A senha deve ter pelo menos 6 caracteres." });
  }

  const { data: targetProfile, error: targetProfileError } = await adminClient
    .from("usuarios")
    .select("id, tenant_id")
    .eq("id", payload.userId)
    .maybeSingle();

  if (targetProfileError) {
    return jsonResponse(500, { error: targetProfileError.message });
  }

  if (!targetProfile || targetProfile.tenant_id !== callerProfile.tenant_id) {
    return jsonResponse(404, {
      error: "Usuário não encontrado no escopo deste administrador.",
    });
  }

  const { error: updateError } = await adminClient.auth.admin.updateUserById(
    payload.userId,
    {
      password: payload.password,
    }
  );

  if (updateError) {
    return jsonResponse(400, { error: updateError.message });
  }

  return jsonResponse(200, { ok: true });
});
