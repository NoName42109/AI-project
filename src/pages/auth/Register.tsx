import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { UserRole } from '../../contexts/AuthContext';

export const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Prevent frontend manipulation to register as admin
    let finalRole = role === 'admin' ? 'student' : role;

    // ĐƠN GIẢN HÓA: Tự động cấp quyền admin cho email chỉ định
    if (email.toLowerCase() === 'admin@viet9.com') {
      finalRole = 'admin';
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Save user to Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        name,
        email,
        role: finalRole,
        createdAt: new Date().toISOString()
      });

      if (finalRole === 'admin') navigate('/admin/dashboard');
      else if (finalRole === 'teacher') navigate('/teacher/dashboard');
      else navigate('/student/dashboard');
      
    } catch (err: any) {
      console.error("Lỗi đăng ký:", err);
      let errorMessage = 'Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.';
      
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'Email này đã được đăng ký. Vui lòng đăng nhập.';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Mật khẩu quá yếu. Vui lòng nhập ít nhất 6 ký tự.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Email không hợp lệ.';
      } else if (err.code === 'auth/operation-not-allowed') {
        errorMessage = 'Lỗi cấu hình: Phương thức đăng nhập bằng Email/Mật khẩu chưa được bật trong Firebase Console.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-card border border-neutral-200">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-neutral-900">
            Đăng ký tài khoản
          </h2>
          <p className="mt-2 text-center text-sm text-neutral-600">
            Hệ thống học tập thích ứng Vi-ét
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">
              {error}
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-neutral-300 placeholder-neutral-500 text-neutral-900 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Họ và tên"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <input
                type="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-neutral-300 placeholder-neutral-500 text-neutral-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <input
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-neutral-300 placeholder-neutral-500 text-neutral-900 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Vai trò</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-neutral-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
            >
              <option value="student">Học sinh</option>
              <option value="teacher">Giáo viên</option>
            </select>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${loading ? 'bg-primary-400' : 'bg-primary-600 hover:bg-primary-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500`}
            >
              {loading ? 'Đang đăng ký...' : 'Đăng ký'}
            </button>
          </div>
          
          <div className="text-center text-sm">
            <span className="text-neutral-600">Đã có tài khoản? </span>
            <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
              Đăng nhập
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};
