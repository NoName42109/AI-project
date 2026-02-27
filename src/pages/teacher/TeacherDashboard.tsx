import React, { useEffect, useState } from 'react';
import { db } from '../../services/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeacherData = async () => {
      if (!user) return;
      try {
        const q = query(collection(db, 'exams'), where('uploadedBy', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const examsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setExams(examsData);
      } catch (error) {
        console.error("Error fetching teacher data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherData();
  }, [user]);

  if (loading) return <div className="p-10 text-center">Đang tải dữ liệu...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-neutral-900 mb-8">Teacher Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
          <h3 className="text-lg font-medium text-neutral-500">Đề Đã Upload</h3>
          <p className="text-3xl font-bold text-primary-600 mt-2">{exams.length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
          <h3 className="text-lg font-medium text-neutral-500">Học Sinh Đã Làm</h3>
          <p className="text-3xl font-bold text-primary-600 mt-2">0</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
          <h3 className="text-lg font-medium text-neutral-500">Điểm Trung Bình</h3>
          <p className="text-3xl font-bold text-primary-600 mt-2">0.0</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-neutral-800">Đề Của Tôi</h2>
          <button 
            onClick={() => navigate('/teacher/upload')}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700"
          >
            + Upload Đề Mới
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Tên Đề</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Thời Gian</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Số Câu</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Trạng Thái</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {exams.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-sm text-neutral-500">
                    Bạn chưa upload đề nào.
                  </td>
                </tr>
              ) : exams.map((exam) => (
                <tr key={exam.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">{exam.title || 'Chưa có tên'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                    {exam.uploadedAt ? new Date(exam.uploadedAt).toLocaleDateString('vi-VN') : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">{exam.questionCount || 0}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Hoạt động</span>
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
