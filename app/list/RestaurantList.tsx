'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Restaurant } from '@/types/database';

const SCHOOL = { lat: 43.8261, lng: 125.2948 };

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km: number) {
  return km < 1 ? Math.round(km * 1000) + 'm' : km.toFixed(1) + 'km';
}

type SortKey = 'distance' | 'rating' | 'price';

export default function RestaurantList({ restaurants }: { restaurants: Restaurant[] }) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>('distance');
  const [searchText, setSearchText] = useState('');

  const filtered = useMemo(() => {
    const lower = searchText.toLowerCase();
    let list = restaurants.filter(
      (r) => r.name.toLowerCase().includes(lower) || (r.category || '').toLowerCase().includes(lower)
    );

    list.sort((a, b) => {
      if (sortKey === 'distance') {
        return calculateDistance(SCHOOL.lat, SCHOOL.lng, a.lat, a.lng) -
               calculateDistance(SCHOOL.lat, SCHOOL.lng, b.lat, b.lng);
      }
      if (sortKey === 'rating') return b.rating - a.rating;
      if (sortKey === 'price') return a.avg_price - b.avg_price;
      return 0;
    });
    return list;
  }, [restaurants, sortKey, searchText]);

  return (
    <>
      <header className="app-header">
        <h1>长春清真餐厅 · 吉大周边</h1>
      </header>
      <div className="view">
        <div className="toolbar">
          <div className="search-wrap">
            <input
              type="text"
              className="search-input"
              placeholder="搜索餐厅名称或菜系..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          <div className="sort-bar">
            <button
              className={`sort-btn ${sortKey === 'distance' ? 'active' : ''}`}
              onClick={() => setSortKey('distance')}
            >
              距离最近
            </button>
            <button
              className={`sort-btn ${sortKey === 'rating' ? 'active' : ''}`}
              onClick={() => setSortKey('rating')}
            >
              评分最高
            </button>
            <button
              className={`sort-btn ${sortKey === 'price' ? 'active' : ''}`}
              onClick={() => setSortKey('price')}
            >
              人均最低
            </button>
          </div>
        </div>
        <div className="list-container">
          {filtered.length === 0 ? (
            <div className="empty-state">没有找到匹配的餐厅</div>
          ) : (
            filtered.map((r) => {
              const dist = formatDistance(calculateDistance(SCHOOL.lat, SCHOOL.lng, r.lat, r.lng));
              return (
                <div
                  key={r.id}
                  className="restaurant-card"
                  onClick={() => router.push(`/restaurant/${r.id}`)}
                >
                  <div className="card-row1">
                    <div className="card-name">{r.name}</div>
                    <div className="card-rating">★ {r.rating}</div>
                  </div>
                  <div className="card-row2">
                    {r.category && <span className="badge">{r.category}</span>}
                    <span className="price-tag">¥{r.avg_price}/人</span>
                    <span>·</span>
                    <span className="dist-tag">{dist}</span>
                  </div>
                  <div className="card-row3">{r.address || '地址待补'}</div>
                </div>
              );
            })
          )}
        </div>
      </div>
      <nav className="bottom-nav">
        <button className="nav-btn" onClick={() => router.push('/')}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
          </svg>
          <span>地图</span>
        </button>
        <button className="nav-btn active">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 5h18v2H3V5zm0 4h18v2H3V9zm0 4h18v2H3v-2zm0 4h18v2H3v-2z" />
          </svg>
          <span>列表</span>
        </button>
      </nav>
    </>
  );
}
