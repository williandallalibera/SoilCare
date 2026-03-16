import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type SaveUserPayload = {
  id?: string;
  nombre?: string;
  email?: string;
  telefono?: string;
  perfil_acesso?: string;
  estado?: string;
  password?: string;
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

function normalizeEmail(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function normalizeRole(value: string | undefined): "admin" | "operador" | null {
  if (value === "admin" || value === "operador") return value;
  return null;
}

function normalizeState(value: string | undefined): "activo" | "inactivo" | null {
  if (value === "activo" || value === "inactivo") return value;
  return null;
}

Deno.serve(async (request) => {
  try {
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

    const { data: callerProfile, error: callerProfileError } = await adminClient
      .from("usuarios")
      .select("id, tenant_id, perfil_acceso, estado")
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
      return jsonResponse(403, {
        error: "Somente administradores ativos com tenant configurado podem salvar usuários.",
      });
    }

    const payload = (await request.json().catch(() => null)) as SaveUserPayload | null;
    if (!payload) {
      return jsonResponse(400, { error: "Payload inválido." });
    }

    const nombre = (payload.nombre ?? "").trim();
    const email = normalizeEmail(payload.email);
    const telefono = (payload.telefono ?? "").trim();
    const perfilAcceso = normalizeRole(payload.perfil_acesso);
    const estado = normalizeState(payload.estado);
    const password = payload.password?.trim() || undefined;

    if (!nombre || !email || !perfilAcceso || !estado) {
      return jsonResponse(400, {
        error: "Informe nome, email, perfil e estado válidos.",
      });
    }

    if (password && password.length < 6) {
      return jsonResponse(400, {
        error: "A senha deve ter pelo menos 6 caracteres.",
      });
    }

    const userMetadata = {
      nombre,
      perfil_acesso: perfilAcceso,
      tenant_id: callerProfile.tenant_id,
    };

    if (payload.id) {
      const { data: targetProfile, error: targetError } = await adminClient
        .from("usuarios")
        .select("id, tenant_id")
        .eq("id", payload.id)
        .maybeSingle();

      if (targetError) {
        return jsonResponse(500, { error: targetError.message });
      }

      if (!targetProfile || targetProfile.tenant_id !== callerProfile.tenant_id) {
        return jsonResponse(404, {
          error: "Usuário não encontrado no escopo deste administrador.",
        });
      }

      const authUpdatePayload: {
        email: string;
        password?: string;
        user_metadata: typeof userMetadata;
      } = {
        email,
        user_metadata: userMetadata,
      };

      if (password) {
        authUpdatePayload.password = password;
      }

      const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(
        payload.id,
        authUpdatePayload
      );

      if (authUpdateError) {
        return jsonResponse(400, { error: authUpdateError.message });
      }

      const { data: savedUser, error: saveError } = await adminClient
        .from("usuarios")
        .upsert({
          id: payload.id,
          tenant_id: callerProfile.tenant_id,
          nombre,
          email,
          telefono: telefono || null,
          perfil_acceso: perfilAcceso,
          estado,
        })
        .select("id, nombre, email, telefono, perfil_acceso, estado, created_at")
        .single();

      if (saveError) {
        return jsonResponse(400, { error: saveError.message });
      }

      return jsonResponse(200, { user: savedUser });
    }

    const { data: createdAuth, error: createAuthError } =
      await adminClient.auth.admin.createUser({
        email,
        password: password ?? "Temp123456!",
        email_confirm: true,
        user_metadata: userMetadata,
      });

    if (createAuthError) {
      return jsonResponse(400, { error: createAuthError.message });
    }

    const createdUserId = createdAuth.user?.id;
    if (!createdUserId) {
      return jsonResponse(500, { error: "Usuário criado sem ID no Auth." });
    }

    const { data: createdProfile, error: createdProfileError } = await adminClient
      .from("usuarios")
      .upsert({
        id: createdUserId,
        tenant_id: callerProfile.tenant_id,
        nombre,
        email,
        telefono: telefono || null,
        perfil_acceso: perfilAcceso,
        estado,
      })
      .select("id, nombre, email, telefono, perfil_acceso, estado, created_at")
      .single();

    if (createdProfileError) {
      return jsonResponse(400, { error: createdProfileError.message });
    }

    return jsonResponse(200, { user: createdProfile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno inesperado.";
    return jsonResponse(500, { error: message });
  }
});
