// Chuyển đổi số tiền thành chữ tiếng Việt chuẩn kế toán

export function docSo(n: number): string {
  const num = Math.round(Math.abs(+n || 0));
  if (!num) return 'Không đồng';

  const c = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const u = ['', ' nghìn', ' triệu', ' tỷ', ' nghìn tỷ', ' triệu tỷ'];

  const r3 = (x: number, full: boolean) => {
    const t = Math.floor(x / 100);
    const ch = Math.floor((x % 100) / 10);
    const d = x % 10;
    let s = '';

    if (full || t > 0) s += c[t] + ' trăm';
    if (ch > 1) {
      s += ' ' + c[ch] + ' mươi';
      if (d === 1) s += ' mốt';
      else if (d === 5) s += ' lăm';
      else if (d === 4) s += ' tư';
      else if (d > 0) s += ' ' + c[d];
    } else if (ch === 1) {
      s += ' mười';
      if (d === 5) s += ' lăm';
      else if (d > 0) s += ' ' + c[d];
    } else if (d > 0) {
      if (full || t > 0) s += ' lẻ';
      s += ' ' + c[d];
    }
    return s.trim();
  };

  const g: number[] = [];
  let temp = num;
  while (temp > 0) {
    g.push(temp % 1000);
    temp = Math.floor(temp / 1000);
  }

  const out: string[] = [];
  for (let i = g.length - 1; i >= 0; i--) {
    if (g[i] === 0) continue;
    out.push(r3(g[i], i !== g.length - 1) + u[i]);
  }

  const result = out.join(' ').replace(/\s+/g, ' ').trim();
  return result.charAt(0).toUpperCase() + result.slice(1) + ' đồng';
}

export function formatVND(amount: number): string {
  return Math.round(amount || 0).toLocaleString('vi-VN') + ' đ';
}

export function formatNumber(amount: number, decimals: number = 1): string {
  return (+amount || 0).toLocaleString('vi-VN', { maximumFractionDigits: decimals });
}
