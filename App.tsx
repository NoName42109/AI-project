import React, { useState } from 'react';
import StudentDashboard from './components/StudentDashboard';
import StudentPracticeView from './components/StudentPracticeView';
import TeacherDashboard from './components/TeacherDashboard';
import ExamView from './components/ExamView';
import AppLayout from './src/layouts/AppLayout';
import { ApiManagementPage } from './src/pages/admin/ApiManagementPage';

type ViewMode = 'TEACHER' | 'STUDENT';
type StudentView = 'DASHBOARD' | 'PRACTICE' | 'EXAM';
type TeacherView = 'UPLOAD' | 'BANK' | 'API_MANAGEMENT';

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('STUDENT');
  const [studentView, setStudentView] = useState<StudentView>('DASHBOARD');
  const [teacherView, setTeacherView] = useState<TeacherView>('UPLOAD');

  return (
    <AppLayout 
      viewMode={viewMode} 
      setViewMode={setViewMode} 
      studentView={studentView} 
      setStudentView={setStudentView}
      teacherView={teacherView}
      setTeacherView={setTeacherView}
    >
      {viewMode === 'TEACHER' ? (
         teacherView === 'API_MANAGEMENT' ? (
           <ApiManagementPage />
         ) : (
           <TeacherDashboard />
         )
      ) : (
         studentView === 'DASHBOARD' ? (
            <StudentDashboard onNavigate={setStudentView} />
         ) : studentView === 'PRACTICE' ? (
            <StudentPracticeView onBack={() => setStudentView('DASHBOARD')} />
         ) : (
            <ExamView studentId="student_1" onBack={() => setStudentView('DASHBOARD')} />
         )
      )}
    </AppLayout>
  );
};

export default App;