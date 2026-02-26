import React, { ReactNode } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useMobile } from '../hooks/useMobile';
import { GlobalApiWarning } from '../components/GlobalApiWarning';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../services/firebase';

type ViewMode = 'TEACHER' | 'STUDENT';
type StudentView = 'DASHBOARD' | 'PRACTICE';
type TeacherView = 'UPLOAD' | 'BANK' | 'API_MANAGEMENT';

interface AppLayoutProps {
  children?: ReactNode;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  studentView: StudentView;
  setStudentView: (view: StudentView) => void;
  teacherView?: TeacherView;
  setTeacherView?: (view: TeacherView) => void;
}

const AppLayout: React.FC<AppLayoutProps> = ({ 
  children, 
  viewMode, 
  setViewMode, 
  studentView, 
  setStudentView,
  teacherView,
  setTeacherView
}) => {
  const isMobile = useMobile();
  const { user, role } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Navigation Items
  const studentNavItems = [
    { 
      id: 'DASHBOARD', 
      label: 'Tổng quan', 
      icon: (active: boolean) => (
        <svg className={`w-6 h-6 ${active ? 'text-primary-600' : 'text-neutral-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    { 
      id: 'PRACTICE', 
      label: 'Luyện tập', 
      icon: (active: boolean) => (
        <svg className={`w-6 h-6 ${active ? 'text-primary-600' : 'text-neutral-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      )
    }
  ];

  const isPracticeMode = viewMode === 'STUDENT' && studentView === 'PRACTICE';

  return (
    <div className="flex h-screen bg-surface overflow-hidden font-sans text-neutral-800">
      
      {/* Desktop Sidebar */}
      {!isPracticeMode && (
        <aside className="hidden md:flex w-64 bg-white border-r border-neutral-200 flex-col z-30 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
          <div className="p-8 pb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm transition-colors ${viewMode === 'TEACHER' ? 'bg-neutral-900 text-white' : 'bg-pastel-purple text-primary-600'}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <span className="font-bold text-lg text-neutral-900 tracking-tight">Vieta Master</span>
            </div>
            <p className="text-xs text-neutral-400 pl-1">Hệ thống học tập thích ứng</p>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 px-4 space-y-1 mt-4">
            {role === 'student' ? (
              <>
                <div className="px-4 py-2 text-xs font-bold text-neutral-400 uppercase tracking-wider">Học tập</div>
                {studentNavItems.map((item) => (
                  <button 
                    key={item.id}
                    onClick={() => {
                      setStudentView(item.id as StudentView);
                      if (item.id === 'DASHBOARD') navigate('/student/dashboard');
                    }}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 transition-colors ${studentView === item.id ? 'bg-pastel-blue text-primary-700' : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900'}`}
                  >
                    {item.icon(studentView === item.id)}
                    {item.label}
                  </button>
                ))}
              </>
            ) : (
              <>
                <div className="px-4 py-2 text-xs font-bold text-neutral-400 uppercase tracking-wider">Quản lý</div>
                {role === 'admin' && (
                  <button 
                    onClick={() => navigate('/admin/dashboard')}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 ${window.location.pathname.includes('/admin') ? 'bg-neutral-800 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900'}`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    Admin Dashboard
                  </button>
                )}
                <button 
                  onClick={() => navigate('/teacher/dashboard')}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 ${window.location.pathname.includes('/teacher') ? 'bg-neutral-800 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900'}`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  Teacher Dashboard
                </button>
              </>
            )}
          </nav>

          {/* User Info */}
          <div className="p-6 border-t border-neutral-100">
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center font-bold text-neutral-500 uppercase">
                    {user?.email?.substring(0, 2) || 'U'}
                  </div>
                  <div className="overflow-hidden">
                     <p className="text-sm font-bold text-neutral-800 truncate">{user?.email}</p>
                     <p className="text-xs text-neutral-400 capitalize">{role}</p>
                  </div>
               </div>
               <button onClick={handleLogout} className="p-2 text-neutral-400 hover:text-red-500 transition-colors" title="Đăng xuất">
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                 </svg>
               </button>
             </div>
          </div>
        </aside>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative flex flex-col h-full">
        {role !== 'student' && <GlobalApiWarning />}
        
        {/* Mobile Header */}
        {!isPracticeMode && (
          <div className="md:hidden h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-4 sticky top-0 z-20">
             <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${viewMode === 'TEACHER' ? 'bg-neutral-900 text-white' : 'bg-pastel-purple text-primary-600'}`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <span className="font-bold text-neutral-900">Vieta Master</span>
             </div>
             <button onClick={handleLogout} className="text-xs font-semibold text-red-500">Đăng xuất</button>
          </div>
        )}

        {/* Content Scroll Area */}
        <div className={`flex-1 overflow-y-auto ${!isPracticeMode ? 'pb-20 md:pb-0' : ''}`}>
          {children || <Outlet />}
        </div>

        {/* Mobile Bottom Navigation */}
        {role === 'student' && !isPracticeMode && (
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 h-16 flex items-center justify-around z-30 px-2 pb-safe">
            {studentNavItems.map((item) => (
              <button 
                key={item.id}
                onClick={() => {
                  setStudentView(item.id as StudentView);
                  if (item.id === 'DASHBOARD') navigate('/student/dashboard');
                }}
                className="flex flex-col items-center justify-center w-full h-full gap-1"
              >
                <div className={`${studentView === item.id ? 'text-primary-600' : 'text-neutral-400'}`}>
                  {item.icon(studentView === item.id)}
                </div>
                <span className={`text-[10px] font-medium ${studentView === item.id ? 'text-primary-600' : 'text-neutral-400'}`}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AppLayout;
