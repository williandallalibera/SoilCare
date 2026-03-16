import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type BootstrapPayload = {
  tenantName?: string;
  adminName?: string;
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

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const {
    data: { user: caller },
    error: callerError,
  } = await callerClient.auth.getUser();

  if (callerError || !caller) {
    return jsonResponse(401, { error: "Sessão inválida." });
  }

  const { data: existingProfile, error: existingProfileError } = await adminClient
    .from("usuarios")
    .select("id, tenant_id, perfil_acceso, estado")
    .eq("id", caller.id)
    .maybeSingle();

  if (existingProfileError) {
    return jsonResponse(500, { error: existingProfileError.message });
  }

  if (existingProfile?.tenant_id && existingProfile.perfil_acceso === "admin") {
    return jsonResponse(200, {
      ok: true,
      tenantId: existingProfile.tenant_id,
      alreadyBootstrapped: true,
    });
  }

  const { count, error: countError } = await adminClient
    .from("solo_tenants")
    .select("id", { count: "exact", head: true });

  if (countError) {
    return jsonResponse(500, { error: countError.message });
  }

  if ((count ?? 0) > 0) {
    return jsonResponse(403, {
      error:
        "O primeiro administrador já foi inicializado. Este usuário precisa ser criado pelo admin dentro da aplicação.",
    });
  }

  const payload = (await request.json().catch(() => null)) as BootstrapPayload | null;
  const adminName =
    payload?.adminName?.trim() ||
    String(caller.user_metadata?.nombre ?? "").trim() ||
    caller.email?.split("@")[0] ||
    "Admin";
  const tenantName = payload?.tenantName?.trim() || `${adminName} Workspace`;

  const { data: tenantId, error: bootstrapError } = await adminClient.rpc(
    "bootstrap_solo_admin",
    {
      p_auth_user_id: caller.id,
      p_tenant_name: tenantName,
      p_admin_name: adminName,
    }
  );

  if (bootstrapError) {
    return jsonResponse(500, { error: bootstrapError.message });
  }

  const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(caller.id, {
    user_metadata: {
      ...(caller.user_metadata ?? {}),
      nombre: adminName,
      perfil_acesso: "admin",
      tenant_id: tenantId,
    },
  });

  if (authUpdateError) {
    return jsonResponse(500, { error: authUpdateError.message });
  }

  return jsonResponse(200, {
    ok: true,
    tenantId,
    alreadyBootstrapped: false,
  });
});
