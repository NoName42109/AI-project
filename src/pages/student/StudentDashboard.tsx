import React, { useEffect, useState } from 'react';
import { db } from '../../services/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';

import { useNavigate } from 'react-router-dom';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudentData = async () => {
      if (!user) return;
      try {
        const q = query(collection(db, 'student_exams'), where('studentId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const historyData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setHistory(historyData);
      } catch (error) {
        console.error("Error fetching student data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [user]);

  if (loading) return <div className="p-10 text-center">Đang tải dữ liệu...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-neutral-900 mb-8">Student Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
          <h3 className="text-lg font-medium text-neutral-500">Bài Đã Làm</h3>
          <p className="text-3xl font-bold text-primary-600 mt-2">{history.length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
          <h3 className="text-lg font-medium text-neutral-500">Điểm Trung Bình</h3>
          <p className="text-3xl font-bold text-primary-600 mt-2">
            {history.length > 0 ? (history.reduce((acc, curr) => acc + curr.score, 0) / history.length).toFixed(1) : '0.0'}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
          <h3 className="text-lg font-medium text-neutral-500">Xếp Hạng</h3>
          <p className="text-3xl font-bold text-primary-600 mt-2">#12</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-neutral-800">Lịch Sử Làm Bài</h2>
          <button 
            onClick={() => navigate('/student/practice')}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700"
          >
            + Luyện Tập Ngay
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Tên Đề</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Thời Gian Nộp</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Điểm Số</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Chi Tiết</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-sm text-neutral-500">
                    Bạn chưa làm bài tập nào. Hãy bắt đầu luyện tập!
                  </td>
                </tr>
              ) : history.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">{item.examTitle || 'Đề kiểm tra'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                    {item.submittedAt ? new Date(item.submittedAt).toLocaleDateString('vi-VN') : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary-600">{item.score}/10</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-600 hover:text-primary-800 cursor-pointer">
                    Xem lại
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
