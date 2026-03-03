import { Routes, Route, Navigate } from "react-router-dom";
import { LoginPage } from "./modules/auth/LoginPage";
import { NotFoundPage } from "./modules/common/NotFoundPage";
import { AdminLayout } from "./modules/layout/AdminLayout";
import { PrivateRoute } from "./modules/auth/PrivateRoute";
import { RoleRoute } from "./modules/auth/RoleRoute";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/404" element={<NotFoundPage />} />

      <Route
        path="/app/*"
        element={
          <PrivateRoute>
            <AdminLayout />
          </PrivateRoute>
        }
      />

      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}

export default App;

