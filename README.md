## Hướng dẫn sử dụng tool tự động học LMS PTIT



### 1. Yêu cầu

- **Node.js:** Cài đặt Node.js trên máy tính của bạn. Bạn có thể tải Node.js tại đây: [https://nodejs.org/](https://nodejs.org/). Node.js giống như một "trình dịch" giúp máy tính hiểu và chạy tool.
- **Mở Terminal:** Mở chương trình Terminal (hoặc Command Prompt) và di chuyển đến thư mục chứa tool bằng lệnh `cd`. Ví dụ, nếu tool được lưu trong thư mục `Downloads/tool-auto-lms-ptit`, bạn gõ lệnh: `cd Downloads/tool-auto-lms-ptit`.

### 2. Cài đặt packages

- Gõ lệnh `npm install` trong Terminal. Lệnh này giống như việc chuẩn bị các "nguyên liệu" cần thiết để tool hoạt động.

### 3. Cấu hình

- **File `.env`:** Mở file `.env` bằng một trình soạn thảo văn bản (như Notepad). File này chứa các thông tin quan trọng để tool hoạt động.
    - **`SLINK_ID`:** Thay thế `your_username` bằng tên đăng nhập Slink của bạn.
    - **`SLINK_PASSWORD`:** Thay thế `your_password` bằng mật khẩu Slink của bạn.
    - **`COURSE_URL`:** Thay thế `https://lms.ptit.edu.vn/slides/bas1152-chu-nghia-xa-hoi-khoa-hoc-8` bằng link của khóa học bạn muốn tự động học.
    - **`GEMINI_API_KEY`:**  Nếu bạn muốn sử dụng Google Gemini để trả lời câu hỏi, hãy thay thế `your_api_key` bằng API key của bạn.
    - **`GEMINI_API_MODEL`:**  Thay thế `your_model` bằng mô hình Gemini bạn muốn sử dụng.
    - **Các thông tin khác:** Bạn có thể giữ nguyên giá trị mặc định cho các thông tin này.

### 4. Chạy ứng dụng

- **Chế độ development:** Chạy lệnh `npm run dev` để build và chạy ứng dụng ở chế độ development. Chế độ này sẽ tự động rebuild ứng dụng khi bạn thay đổi code, giúp bạn dễ dàng phát triển và debug.
- **Chạy start:** Sau khi build xong (hoặc khi đang chạy ở chế độ development), chạy lệnh `npm run start` để khởi động ứng dụng. Ứng dụng sẽ tự động đăng nhập vào LMS PTIT, truy cập khóa học và thực hiện các thao tác tự động theo cấu hình.

### 5. Lưu ý

-  Hãy chắc chắn bạn đã cài đặt Chrome trên máy tính, vì tool cần Chrome để hoạt động.
-  Nhập đúng thông tin vào file `.env`.

Chúc bạn sử dụng tool thành công và học tập hiệu quả!
