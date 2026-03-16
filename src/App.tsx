import { Routes, Route, Navigate } from "react-router-dom";
import { LoginPage } from "./modules/auth/LoginPage";
import { NotFoundPage } from "./modules/common/NotFoundPage";
import { AdminLayout } from "./modules/layout/AdminLayout";
import { PrivateRoute } from "./modules/auth/PrivateRoute";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/404" element={<NotFoundPage />} />

      {/* Admin Routes handled by AdminLayout */}
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
