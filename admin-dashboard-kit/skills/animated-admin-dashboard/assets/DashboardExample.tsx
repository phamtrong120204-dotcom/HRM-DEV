"use client";
// Reference composition: copy, then replace the demo data with real queries.
import { useState } from "react";
import { BarChart3, Users, Wallet, Settings, LayoutGrid, LogOut, Sparkles } from "lucide-react";
import {
  ActivityList, BentoGrid, Card, CardTitle, MiniBars, PageHeader,
  BottomPillBar, PillSidebar, ProgressBar, Segmented, Sparkline, StatCard,
} from "./components";

const NAV = [
  { id: "overview", label: "Tổng quan", icon: <LayoutGrid size={20} /> },
  { id: "customers", label: "Khách hàng", icon: <Users size={20} /> },
  { id: "revenue", label: "Doanh thu", icon: <Wallet size={20} /> },
  { id: "reports", label: "Báo cáo", icon: <BarChart3 size={20} /> },
  { id: "settings", label: "Cài đặt", icon: <Settings size={20} /> },
];

export default function DashboardExample() {
  const [page, setPage] = useState("overview");
  const [range, setRange] = useState<"week" | "month">("week");

  return (
    <div className="dash-root flex min-h-dvh gap-4 p-4 md:gap-6 md:p-5">
      <PillSidebar
        items={NAV}
        active={page}
        onSelect={setPage}
        logo={<Sparkles size={22} />}
        footer={{ id: "logout", label: "Đăng xuất", icon: <LogOut size={20} /> }}
      />
      <BottomPillBar items={NAV} active={page} onSelect={setPage} />
      <main className="min-w-0 flex-1 pb-24 md:pb-0">
        <PageHeader
          title="Tổng quan"
          subtitle="Số liệu cập nhật theo thời gian thực từ hệ thống của bạn."
          actions={
            <Segmented
              label="Khoảng thời gian"
              value={range}
              onChange={setRange}
              options={[{ value: "week", label: "Tuần" }, { value: "month", label: "Tháng" }]}
            />
          }
        />
        <BentoGrid>
          <Card tone="lilac" pad="lg" className="col-span-12 xl:col-span-8">
            <h2 className="text-2xl font-semibold tracking-tight">Chào buổi sáng, hôm nay có 3 việc cần duyệt</h2>
            <p className="mt-1 max-w-prose text-sm opacity-70">Đơn hàng mới và yêu cầu hỗ trợ đang chờ bạn xử lý.</p>
          </Card>
          <StatCard className="col-span-12 sm:col-span-6 xl:col-span-4" tone="ink" title="Doanh thu" value={128450000} suffix=" ₫" delta={12.4} />
          <StatCard className="col-span-12 sm:col-span-6 xl:col-span-4" title="Khách hàng mới" value={1284} delta={-3.1}>
            <Sparkline data={[4, 7, 5, 9, 8, 12, 10, 14]} />
          </StatCard>
          <StatCard className="col-span-12 sm:col-span-6 xl:col-span-4" title="Tỉ lệ hoàn thành" value={9.7} decimals={1} suffix="h" delta={5}>
            <ProgressBar value={72} label="Hoàn thành 72%" />
          </StatCard>
          <Card className="col-span-12 sm:col-span-6 xl:col-span-4">
            <CardTitle>Tác động theo ngày</CardTitle>
            <MiniBars data={[3, 5, 4, 8, 6, 9, 5]} highlight={5} />
          </Card>
          <Card className="col-span-12">
            <CardTitle>Hoạt động gần đây</CardTitle>
            <ActivityList
              items={[
                { id: "1", title: "Đơn #1042 đã thanh toán", meta: "2 phút trước", badge: "Mới" },
                { id: "2", title: "Khách hàng Lan Anh gửi yêu cầu hỗ trợ", meta: "18 phút trước" },
                { id: "3", title: "Báo cáo tuần đã sẵn sàng", meta: "1 giờ trước" },
              ]}
            />
          </Card>
        </BentoGrid>
      </main>
    </div>
  );
}
