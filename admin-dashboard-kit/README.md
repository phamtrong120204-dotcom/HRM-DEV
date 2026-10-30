# Admin Dashboard Kit (kiểu Dashboard V18)

Bộ skill + agent để dựng trang quản trị có animation, số liệu chuyển động và các khung bento giống video bạn gửi. Dùng lại cho mọi dự án.

## Gồm gì
| Thành phần | Vai trò |
|---|---|
| `skills/animated-admin-dashboard` | Ngôn ngữ thiết kế + 11 component có sẵn (AnimatedNumber, Card, BentoGrid, StatCard, MiniBars, Sparkline, ProgressBar, PillSidebar, BottomPillBar, Segmented, ActivityList, PageHeader) + tài liệu motion/data |
| `agents/dashboard-architect` | Lên kế hoạch: chọn số liệu, wireframe, hợp đồng dữ liệu |
| `agents/dashboard-builder` | Code theo kế hoạch bằng component của kit |
| `agents/dashboard-reviewer` | Kiểm tra cuối: token, motion, a11y, responsive, loading/empty/error |
| `commands/new-dashboard.md` | Lệnh `/new-dashboard ...` chạy cả 3 agent theo thứ tự |

## Cài đặt (Claude Code)
```bash
unzip admin-dashboard-kit.zip && cd admin-dashboard-kit
./install.sh            # dùng cho mọi dự án (~/.claude)
./install.sh --project  # hoặc chỉ dự án hiện tại
```

## Dùng
Trong Claude Code, tại thư mục dự án:
```
/new-dashboard trang tổng quan doanh thu, đơn hàng, khách mới cho MTK
```
Hoặc chỉ cần nói tự nhiên: "làm trang quản trị cho ..., số liệu chạy animation" — skill sẽ tự được kích hoạt.

Dự án cần: React/Next.js/Vite + Tailwind, `npm i framer-motion lucide-react`.

## Dùng trên Claude.ai
Tải file `animated-admin-dashboard.skill` và bấm **Save skill**. (Agent và lệnh chỉ có trong Claude Code.)

## Tùy biến thương hiệu
Đổi màu `--dash-lilac` / `--dash-lilac-strong` trong `tokens.css` trước tiên — đó là màu nhận diện. Các màu pastel còn lại giữ nguyên để giữ cảm giác "bento".

## Lưu ý
- Màu và kích thước được ước lượng từ khung hình video, không phải mã nguồn gốc của tác giả video; hãy chỉnh theo mắt.
- Component chưa được chạy thử trong trình duyệt ở môi trường tạo kit (không có mạng để cài thư viện). Chỉ đã kiểm tra cú pháp. Lần đầu dùng, chạy `npm run build` và xem bằng mắt ở 375 / 768 / 1280 px.
