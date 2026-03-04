import { Navigate, useLocation } from "react-router-dom";
import { getRole, getRoleHome, getToken, isTokenStructurallyValid } from "../utils/auth";

function ProtectedRoute({ allowedRoles, children }) {
  const location = useLocation();
  const token = getToken();
  const role = getRole();

  if (!token || !isTokenStructurallyValid(token)) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={getRoleHome(role)} replace />;
  }

  return children;
}

export default ProtectedRoute;
