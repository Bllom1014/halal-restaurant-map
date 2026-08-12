'use client';

import { useRouter } from 'next/navigation';

export default function BottomNav({ active }: { active: 'map' | 'list' | 'admin' }) {
  const router = useRouter();

  return (
    <nav className="bottom-nav">
      <button
        className={`nav-btn ${active === 'map' ? 'active' : ''}`}
        onClick={() => router.push('/')}
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
        </svg>
        <span>地图</span>
      </button>
      <button
        className={`nav-btn ${active === 'list' ? 'active' : ''}`}
        onClick={() => router.push('/list')}
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 5h18v2H3V5zm0 4h18v2H3V9zm0 4h18v2H3v-2zm0 4h18v2H3v-2z" />
        </svg>
        <span>列表</span>
      </button>
      <button
        className={`nav-btn ${active === 'admin' ? 'active' : ''}`}
        onClick={() => router.push('/admin')}
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7.4-6.3-4.6L5.7 21.4 8 14 2 9.4h7.6z" />
        </svg>
        <span>管理</span>
      </button>
    </nav>
  );
}
