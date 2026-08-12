export const metadata = {
  title: '长春清真餐厅地图 · 吉大周边',
  description: '以学校为中心的清真餐厅地图，按距离/评分/人均排序'
};

import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
