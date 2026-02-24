# Hướng dẫn Phát hành Ứng dụng (Vercel + Firebase)

Tài liệu này hướng dẫn cách triển khai ứng dụng lên Vercel và cấu hình Firebase để lưu trữ dữ liệu.

## 1. Cấu hình Firebase

### Bước 1: Tạo Project Firebase
1. Truy cập [Firebase Console](https://console.firebase.google.com/).
2. Nhấn **Add project** và đặt tên (ví dụ: `viet-math-app`).
3. Tắt Google Analytics (nếu không cần thiết) và nhấn **Create project**.

### Bước 2: Tạo Firestore Database
1. Trong menu bên trái, chọn **Build** -> **Firestore Database**.
2. Nhấn **Create database**.
3. Chọn Location (ví dụ: `asia-southeast1` cho Singapore).
4. Chọn **Start in test mode** (để dễ dàng phát triển, sau này sẽ chỉnh Rules sau).

### Bước 3: Lấy Config Key
1. Vào **Project settings** (biểu tượng bánh răng).
2. Cuộn xuống phần **Your apps**, nhấn biểu tượng **Web (</>)**.
3. Đặt tên App (ví dụ: `Web App`) và nhấn **Register app**.
4. Bạn sẽ thấy đoạn mã `const firebaseConfig = { ... }`. Hãy copy các giá trị trong đó.

Các giá trị cần lấy:
- `apiKey`
- `authDomain`
- `projectId`
- `storageBucket`
- `messagingSenderId`
- `appId`

## 2. Cấu hình Vercel

### Bước 1: Đẩy code lên GitHub/GitLab
1. Tạo repository mới trên GitHub.
2. Push toàn bộ code hiện tại lên repository đó.

### Bước 2: Tạo Project trên Vercel
1. Truy cập [Vercel Dashboard](https://vercel.com/dashboard).
2. Nhấn **Add New...** -> **Project**.
3. Import repository bạn vừa tạo.
4. Vercel sẽ tự động nhận diện đây là Vite project.

### Bước 3: Thiết lập Environment Variables
Trong phần **Environment Variables** trên Vercel, hãy thêm các biến sau (lấy giá trị từ Firebase và Gemini):

| Tên Biến | Giá trị (Ví dụ) |
|----------|-----------------|
| `GEMINI_API_KEY` | `AIzaSy...` (Key của Gemini AI) |
| `VITE_FIREBASE_API_KEY` | `AIzaSy...` (Từ Firebase Config) |
| `VITE_FIREBASE_AUTH_DOMAIN` | `project-id.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `project-id` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `project-id.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `123456...` |
| `VITE_FIREBASE_APP_ID` | `1:123456...` |

### Bước 4: Deploy
1. Nhấn **Deploy**.
2. Chờ vài phút để Vercel build và deploy ứng dụng.
3. Sau khi xong, bạn sẽ nhận được đường link (ví dụ: `https://viet-math-app.vercel.app`).

## 3. Kiểm tra hoạt động

1. Truy cập trang web vừa deploy.
2. Vào **Teacher Admin** (Giao diện giáo viên).
3. Upload một file PDF đề thi thử.
4. Sau khi quét xong, nhấn **Lưu vào Kho**.
5. Kiểm tra trên Firebase Console -> Firestore Database xem dữ liệu đã được lưu vào collection `questions` chưa.
6. Vào giao diện Học sinh -> **Kiểm tra thử**.
7. Hệ thống sẽ lấy câu hỏi từ Firebase (nếu có) hoặc AI sẽ tự sinh nếu thiếu.

## Lưu ý quan trọng

- **CORS**: Nếu gặp lỗi CORS khi upload ảnh/file, hãy cấu hình CORS cho Firebase Storage (nếu dùng Storage).
- **Security Rules**: Hiện tại Firestore đang để Test Mode. Khi chạy thật, cần cập nhật Rules để chỉ cho phép Admin ghi dữ liệu.

Ví dụ Firestore Rules cơ bản:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // CẢNH BÁO: Chỉ dùng cho Test!
    }
  }
}
```
