'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { loadAMap } from '@/lib/amap';
import type { Restaurant } from '@/types/database';

const SCHOOL = { name: '吉林大学(前卫南区)', lng: 125.2948, lat: 43.8261 };

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

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

type Props = {
  restaurants: Restaurant[];
};

export default function MapView({ restaurants }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const router = useRouter();

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    loadAMap().then((AMap) => {
      const map = new AMap.Map(mapRef.current, {
        center: [SCHOOL.lng, SCHOOL.lat],
        zoom: 14,
        viewMode: '2D',
        resizeEnable: true,
      });
      mapInstanceRef.current = map;

      // 学校标注 - 蓝色圆点 + 脉冲
      const schoolMarker = new AMap.Marker({
        position: [SCHOOL.lng, SCHOOL.lat],
        content: `<div style="position:relative;">
          <div style="width:20px;height:20px;border-radius:50%;background:#185FA5;opacity:0.3;position:absolute;top:0;left:0;animation:amapPulse 2s ease-out infinite;"></div>
          <div style="width:16px;height:16px;border-radius:50%;background:#185FA5;border:3px solid #fff;box-shadow:0 2px 6px rgba(24,95,165,0.4);position:relative;z-index:2;"></div>
          <div style="position:absolute;top:-24px;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:12px;font-weight:600;color:#185FA5;background:rgba(255,255,255,0.9);padding:2px 8px;border-radius:4px;">${SCHOOL.name}</div>
        </div>`,
        offset: new AMap.Pixel(-10, -10),
        anchor: 'center',
      });
      map.add(schoolMarker);

      schoolMarker.on('click', () => {
        const info = new AMap.InfoWindow({
          content: `<div style="padding:8px 12px;min-width:160px;">
            <div style="font-size:15px;font-weight:600;">${SCHOOL.name}</div>
            <div style="font-size:12px;color:#666;margin-top:4px;">周边 ${restaurants.length} 家清真餐厅</div>
          </div>`,
          offset: new AMap.Pixel(0, -20),
        });
        info.open(map, [SCHOOL.lng, SCHOOL.lat]);
      });

      // 餐厅标注 - 绿色水滴
      restaurants.forEach((r) => {
        const dist = calculateDistance(SCHOOL.lat, SCHOOL.lng, r.lat, r.lng);
        const distStr = formatDistance(dist);

        const marker = new AMap.Marker({
          position: [r.lng, r.lat],
          content: `<div style="cursor:pointer;">
            <svg width="28" height="36" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 22 14 22s14-11.5 14-22c0-7.7-6.3-14-14-14z" fill="#0F6E56" stroke="#fff" stroke-width="1.5"/>
              <circle cx="14" cy="14" r="5" fill="#fff"/>
            </svg>
            <div style="position:absolute;top:36px;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:11px;font-weight:500;color:#333;background:rgba(255,255,255,0.88);padding:1px 6px;border-radius:3px;max-width:100px;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(r.name)}</div>
          </div>`,
          offset: new AMap.Pixel(-14, -36),
          anchor: 'bottom-center',
        });
        map.add(marker);

        const popupHtml = `<div style="padding:10px 14px;min-width:200px;font-family:-apple-system,sans-serif;">
          <div style="font-size:15px;font-weight:600;margin-bottom:4px;">${escapeHtml(r.name)}</div>
          <div style="font-size:12px;color:#666;margin-bottom:6px;">
            <span style="color:#F5A623;">★ ${r.rating}</span>
            <span style="color:#ddd;margin:0 6px;">|</span>
            <span>¥${r.avg_price}/人</span>
            <span style="color:#ddd;margin:0 6px;">|</span>
            <span style="color:#185FA5;">${distStr}</span>
          </div>
          <div style="font-size:11px;color:#999;margin-bottom:8px;">${escapeHtml(r.address || '地址待补')}</div>
          <button id="amap-detail-btn-${r.id}" style="display:block;width:100%;padding:6px 0;background:#0F6E56;color:#fff;font-size:12px;border:none;border-radius:6px;cursor:pointer;">查看详情</button>
        </div>`;

        marker.on('click', () => {
          const info = new AMap.InfoWindow({
            content: popupHtml,
            offset: new AMap.Pixel(0, -36),
          });
          info.open(map, marker);

          // 延迟绑定按钮事件（等 DOM 渲染）
          setTimeout(() => {
            const btn = document.getElementById(`amap-detail-btn-${r.id}`);
            if (btn) {
              btn.addEventListener('click', () => {
                router.push('/restaurant/' + r.id);
              });
            }
          }, 100);
        });
      });

      // 比例尺
      map.addControl(new AMap.Scale({
        offset: [10, 10],
      }));

    }).catch((err) => {
      console.error('AMap load error:', err);
      if (mapRef.current) {
        mapRef.current.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#999;font-size:14px;">地图加载失败：${err.message}<br/>请检查高德地图 Key 配置</div>`;
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
    };
  }, [restaurants, router]);

  return (
    <div id="map">
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      <div className="map-overlay">
        <div className="map-info-card">
          <div className="map-info-icon" />
          <div className="map-info-text">中心：<strong>{SCHOOL.name}</strong></div>
        </div>
      </div>
      <div className="map-legend">
        <div className="legend-item"><div className="legend-dot" style={{ background: '#185FA5' }} />学校</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: '#0F6E56' }} />清真餐厅</div>
      </div>
    </div>
  );
}
