import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth, UserRole } from '../contexts/AuthContext';
import { LoadingScreen } from './LoadingScreen';

interface ProtectedRouteProps {
  allowedRoles: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return <LoadingScreen message="Đang kiểm tra quyền truy cập..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (role && !allowedRoles.includes(role)) {
    // Redirect to appropriate dashboard if wrong role
    if (role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (role === 'teacher') return <Navigate to="/teacher/dashboard" replace />;
    return <Navigate to="/student/dashboard" replace />;
  }

  return <Outlet />;
};
