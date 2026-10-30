import { Building2, Check, ChevronDown, PlusCircle, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { MOCK_TENANT } from '../mockData';
import { TenantRole } from '../types';

interface TenantSwitcherProps {
  currentRole?: TenantRole;
  onTenantChange?: (tenantId: string) => void;
}

export function TenantSwitcher({ currentRole = 'OWNER' }: TenantSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(MOCK_TENANT);

  const mockTenants = [
    MOCK_TENANT,
    {
      id: 'tenant-demo-2',
      name: 'Công ty Cổ phần Thương Mại An Phát',
      slug: 'an-phat-trading',
      taxId: '0108877665',
      isActive: true,
      subscriptionTier: 'starter' as const,
    },
    {
      id: 'tenant-demo-3',
      name: 'Chuỗi Cửa Hàng Bán Lẻ FastMart',
      slug: 'fastmart-retail',
      taxId: '0315544332',
      isActive: true,
      subscriptionTier: 'enterprise' as const,
    },
  ];

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="border-border hover:bg-muted/50 bg-background flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium shadow-xs transition-colors"
        aria-expanded={isOpen}
      >
        <Building2 className="text-primary h-4 w-4" />
        <span className="max-w-[200px] truncate font-semibold text-foreground">
          {selectedTenant.name}
        </span>
        <span className="bg-primary/10 text-primary border-primary/20 rounded-full border px-2 py-0.5 text-[10px] font-semibold">
          {currentRole}
        </span>
        <ChevronDown className="text-muted-foreground h-3.5 w-3.5" />
      </button>

      {isOpen && (
        <div
          className="border-border bg-card text-card-foreground absolute left-0 z-50 mt-1.5 w-72 rounded-xl border p-1 shadow-lg ring-1 ring-black/5 focus:outline-none"
          role="menu"
        >
          <div className="border-border text-muted-foreground border-b px-3 py-2 text-[11px] font-medium">
            DANH SÁCH DOANH NGHIỆP TRỰC THUỘC
          </div>

          <div className="py-1">
            {mockTenants.map((tenant) => (
              <button
                key={tenant.id}
                type="button"
                onClick={() => {
                  setSelectedTenant(tenant);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                  tenant.id === selectedTenant.id
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-foreground hover:bg-muted'
                }`}
                role="menuitem"
              >
                <div className="min-w-0 pr-2">
                  <div className="truncate">{tenant.name}</div>
                  <div className="text-muted-foreground text-[10px]">
                    MST: {tenant.taxId || 'Chưa cập nhật'} · Gói: {tenant.subscriptionTier.toUpperCase()}
                  </div>
                </div>
                {tenant.id === selectedTenant.id && <Check className="text-primary h-4 w-4 shrink-0" />}
              </button>
            ))}
          </div>

          <div className="border-border border-t pt-1">
            <button
              type="button"
              onClick={() => {
                alert('Chức năng "Đăng ký thêm doanh nghiệp mới" sẽ khả dụng khi kết nối Backend ở Giai đoạn tiếp theo.');
                setIsOpen(false);
              }}
              className="text-primary hover:bg-primary/10 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Tạo thêm doanh nghiệp mới</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
