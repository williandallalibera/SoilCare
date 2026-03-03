import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="content-wrapper" style={{ minHeight: "100vh" }}>
      <section className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1>Página no encontrada</h1>
            </div>
          </div>
        </div>
      </section>

      <section className="content">
        <div className="error-page">
          <h2 className="headline text-warning">404</h2>

          <div className="error-content">
            <h3>
              <i className="fas fa-exclamation-triangle text-warning" />{" "}
              Ocurrió un error.
            </h3>
            <p>
              No tiene acceso al recurso solicitado o la página no existe. Si
              el problema persiste, contacte al administrador del sistema.
            </p>
            <p>
              Puede volver al{" "}
              <Link to="/login" className="text-success">
                inicio de sesión
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

