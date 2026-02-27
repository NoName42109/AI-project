import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './src/contexts/AuthContext';
import { ProtectedRoute } from './src/components/ProtectedRoute';
import { Login } from './src/pages/auth/Login';
import { Register } from './src/pages/auth/Register';
import { AdminDashboard } from './src/pages/admin/AdminDashboard';
import { ApiManagementPage } from './src/pages/admin/ApiManagementPage';
import { TeacherDashboard } from './src/pages/teacher/TeacherDashboard';
import { TeacherUpload } from './src/pages/teacher/TeacherUpload';
import { StudentDashboard } from './src/pages/student/StudentDashboard';
import AppLayout from './src/layouts/AppLayout';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin" element={<AppLayout viewMode="TEACHER" setViewMode={() => {}} studentView="DASHBOARD" setStudentView={() => {}} teacherView="UPLOAD" setTeacherView={() => {}} />}>
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="api-keys" element={<ApiManagementPage />} />
            </Route>
          </Route>

          {/* Teacher Routes */}
          <Route element={<ProtectedRoute allowedRoles={['teacher', 'admin']} />}>
            <Route path="/teacher" element={<AppLayout viewMode="TEACHER" setViewMode={() => {}} studentView="DASHBOARD" setStudentView={() => {}} teacherView="UPLOAD" setTeacherView={() => {}} />}>
              <Route path="dashboard" element={<TeacherDashboard />} />
              <Route path="upload" element={<TeacherUpload />} />
            </Route>
          </Route>

          {/* Student Routes */}
          <Route element={<ProtectedRoute allowedRoles={['student']} />}>
            <Route path="/student" element={<AppLayout viewMode="STUDENT" setViewMode={() => {}} studentView="DASHBOARD" setStudentView={() => {}} teacherView="UPLOAD" setTeacherView={() => {}} />}>
              <Route path="dashboard" element={<StudentDashboard />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;