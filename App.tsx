import React, { useState } from 'react';
import StudentDashboard from './components/StudentDashboard';
import StudentPracticeView from './components/StudentPracticeView';
import TeacherDashboard from './components/TeacherDashboard';
import AppLayout from './src/layouts/AppLayout';

type ViewMode = 'TEACHER' | 'STUDENT';
type StudentView = 'DASHBOARD' | 'PRACTICE';

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('STUDENT');
  const [studentView, setStudentView] = useState<StudentView>('DASHBOARD');

  return (
    <AppLayout 
      viewMode={viewMode} 
      setViewMode={setViewMode} 
      studentView={studentView} 
      setStudentView={setStudentView}
    >
      {viewMode === 'TEACHER' ? (
         <TeacherDashboard />
      ) : (
         studentView === 'DASHBOARD' ? (
            <StudentDashboard onNavigate={setStudentView} />
         ) : (
            <StudentPracticeView onBack={() => setStudentView('DASHBOARD')} />
         )
      )}
    </AppLayout>
  );
};

export default App;