import React, { useState } from 'react';
import StudentDashboard from './components/StudentDashboard';
import StudentPracticeView from './components/StudentPracticeView';
import TeacherDashboard from './components/TeacherDashboard';
import ExamView from './components/ExamView';
import AppLayout from './src/layouts/AppLayout';

type ViewMode = 'TEACHER' | 'STUDENT';
type StudentView = 'DASHBOARD' | 'PRACTICE' | 'EXAM';

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