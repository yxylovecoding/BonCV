import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BonCV · 组合你的下一份简历',
  description: '管理经历、组合简历方案，并生成真实的 TeX 与 PDF 文件。',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
