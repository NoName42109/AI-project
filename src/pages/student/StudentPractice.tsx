import React from 'react';
import { useNavigate } from 'react-router-dom';
import StudentPracticeView from '../../../components/StudentPracticeView';

export const StudentPractice: React.FC = () => {
  const navigate = useNavigate();
  return <StudentPracticeView onBack={() => navigate('/student/dashboard')} />;
};
