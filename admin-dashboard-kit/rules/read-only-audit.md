# Chế độ audit chỉ đọc

Khi thực hiện audit, review hoặc quét lỗi dự án:

## Tuyệt đối không
- Sửa, tạo, đổi tên, di chuyển hoặc xóa bất kỳ file nào trong dự án.
- Chạy lệnh làm thay đổi trạng thái: git commit/push/checkout/reset, npm install, migrate, deploy, ghi database.
- Gọi API hoặc tấn công thử trên môi trường production.
- In ra hoặc sao chép giá trị thật của secret, API key, token. Chỉ ghi "đã phát hiện secret tại file:dòng".

## Được phép
- Đọc file, tìm kiếm, liệt kê thư mục.
- Chạy lệnh chỉ đọc: git status, git log, git diff, grep, và các scanner ở chế độ báo cáo.

## Đầu ra
- Chỉ xuất báo cáo dạng Markdown trong khung chat, hoặc vào một file duy nhất do người dùng chỉ định.
- Mỗi lỗi ghi rõ: mức độ, file:dòng, tác động, cách tái hiện, đề xuất sửa (chỉ mô tả, không tự áp dụng).
- Nếu cần sửa gì để tiếp tục, dừng lại và hỏi người dùng.