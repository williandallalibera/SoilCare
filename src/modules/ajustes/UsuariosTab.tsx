import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

interface UsuarioRow {
  id: string;
  nombre: string | null;
  email: string | null;
  perfil_acceso: string;
  estado: string;
}

const perfiles = [
  { value: "admin", label: "Admin" },
  { value: "rtv", label: "RTV" },
  { value: "cliente", label: "Cliente" }
];

export function UsuariosTab() {
  const [rows, setRows] = useState<UsuarioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<UsuarioRow | null>(null);
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    perfil_acceso: "rtv",
    estado: "activo",
    password: ""
  });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("usuarios")
      .select("id, nombre, email, perfil_acceso, estado")
      .order("created_at", { ascending: false });
    if (!error && data) {
      setRows(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setEditing(null);
    setForm({
      nombre: "",
      email: "",
      perfil_acceso: "rtv",
      estado: "activo",
      password: ""
    });
  };

  const handleEdit = (u: UsuarioRow) => {
    setEditing(u);
    setForm({
      nombre: u.nombre ?? "",
      email: u.email ?? "",
      perfil_acceso: u.perfil_acceso,
      estado: u.estado,
      password: ""
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);

    if (editing) {
      await supabase
        .from("usuarios")
        .update({
          nombre: form.nombre,
          email: form.email,
          perfil_acceso: form.perfil_acceso,
          estado: form.estado
        })
        .eq("id", editing.id);
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            nombre: form.nombre,
            perfil_acceso: form.perfil_acceso
          }
        }
      });
      if (!error && data.user) {
        await supabase.from("usuarios").insert({
          id: data.user.id,
          nombre: form.nombre,
          email: form.email,
          perfil_acceso: form.perfil_acceso,
          estado: form.estado
        });
      }
    }

    await load();
    resetForm();
    setSaving(false);
  };

  if (loading) {
    return <span>Cargando usuarios...</span>;
  }

  return (
    <div className="row">
      <div className="col-md-6">
        <h5>Listado de usuarios</h5>
        <div className="table-responsive">
          <table className="table table-sm table-striped">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Perfil</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td>{u.nombre}</td>
                  <td>{u.email}</td>
                  <td>{u.perfil_acceso}</td>
                  <td>{u.estado}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-xs btn-outline-success"
                      onClick={() => handleEdit(u)}
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="col-md-6">
        <h5>{editing ? "Editar usuario" : "Nuevo usuario"}</h5>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nombre</label>
            <input
              className="form-control"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Nombre completo"
              required
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              className="form-control"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Correo electrónico"
              required
            />
          </div>
          {!editing && (
            <div className="form-group">
              <label>Contraseña inicial</label>
              <input
                type="password"
                className="form-control"
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
                placeholder="Contraseña temporal"
                required
              />
            </div>
          )}
          <div className="form-row">
            <div className="form-group col-md-6">
              <label>Perfil de acceso</label>
              <select
                className="form-control"
                value={form.perfil_acceso}
                onChange={(e) =>
                  setForm({ ...form, perfil_acceso: e.target.value })
                }
              >
                {perfiles.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group col-md-6">
              <label>Estado</label>
              <select
                className="form-control"
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value })}
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-success" disabled={saving}>
            {saving ? "Guardando..." : "Guardar"}
          </button>
          {editing && (
            <button
              type="button"
              className="btn btn-secondary ml-2"
              onClick={resetForm}
            >
              Cancelar
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

