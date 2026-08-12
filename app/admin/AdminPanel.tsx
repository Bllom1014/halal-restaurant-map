'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { loadAMap } from '@/lib/amap';
import type { Restaurant } from '@/types/database';

const SCHOOL = { name: '吉林大学(前卫南区)', lng: 125.2948, lat: 43.8261 };

type Dish = { name: string; price: string; desc: string };
type POIResult = {
  id: string;
  name: string;
  address: string;
  tel: string;
  lng: number;
  lat: number;
};

export default function AdminPanel({ initialRestaurants }: { initialRestaurants: Restaurant[] }) {
  const router = useRouter();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const clickMarkerRef = useRef<any>(null);

  const [restaurants, setRestaurants] = useState<Restaurant[]>(initialRestaurants);
  const [selectedLatLng, setSelectedLatLng] = useState<{ lat: number; lng: number } | null>(null);

  // 搜索
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<POIResult[]>([]);
  const [searching, setSearching] = useState(false);

  // 表单
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('清真菜');
  const [avgPrice, setAvgPrice] = useState('');
  const [rating, setRating] = useState('4.5');
  const [description, setDescription] = useState('');
  const [meituanUrl, setMeituanUrl] = useState('');
  const [dishes, setDishes] = useState<Dish[]>([{ name: '', price: '', desc: '' }]);

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  // 初始化地图
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

      // 学校标注
      const schoolMarker = new AMap.Marker({
        position: [SCHOOL.lng, SCHOOL.lat],
        content: `<div style="width:16px;height:16px;border-radius:50%;background:#185FA5;border:3px solid #fff;box-shadow:0 2px 6px rgba(24,95,165,0.4);"></div>`,
        offset: new AMap.Pixel(-8, -8),
        anchor: 'center',
      });
      map.add(schoolMarker);

      // 已有餐厅标注
      restaurants.forEach((r) => {
        const marker = new AMap.Marker({
          position: [r.lng, r.lat],
          content: `<div><svg width="24" height="32" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg"><path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 22 14 22s14-11.5 14-22c0-7.7-6.3-14-14-14z" fill="#0F6E56" stroke="#fff" stroke-width="1.5"/><circle cx="14" cy="14" r="5" fill="#fff"/></svg></div>`,
          offset: new AMap.Pixel(-12, -32),
          anchor: 'bottom-center',
        });
        map.add(marker);
      });

      // 点击地图选位置
      map.on('click', (e: any) => {
        const { lng, lat } = e.lnglat;
        setClickMarker(AMap, map, lat, lng);
        setSelectedLatLng({ lat, lng });
      });
    }).catch((err) => {
      console.error('AMap load error:', err);
      if (mapRef.current) {
        mapRef.current.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#999;font-size:14px;text-align:center;padding:20px;">地图加载失败：${err.message}<br/>请在 .env.local 中配置 NEXT_PUBLIC_AMAP_KEY</div>`;
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 设置/更新点击标注
  const setClickMarker = (AMap: any, map: any, lat: number, lng: number) => {
    if (clickMarkerRef.current) {
      map.remove(clickMarkerRef.current);
    }
    clickMarkerRef.current = new AMap.Marker({
      position: [lng, lat],
      content: `<div><svg width="32" height="42" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg"><path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 22 14 22s14-11.5 14-22c0-7.7-6.3-14-14-14z" fill="#E53935" stroke="#fff" stroke-width="2"/><circle cx="14" cy="14" r="5" fill="#fff"/></svg></div>`,
      offset: new AMap.Pixel(-16, -42),
      anchor: 'bottom-center',
    });
    map.add(clickMarkerRef.current);
    clickMarkerRef.current.bindPopup = true;

    const info = new AMap.InfoWindow({
      content: `<div style="font-size:13px;font-weight:600;">已选位置</div><div style="font-size:11px;color:#999;">${lat.toFixed(6)}, ${lng.toFixed(6)}</div>`,
      offset: new AMap.Pixel(0, -42),
    });
    info.open(map, [lng, lat]);
  };

  // POI 搜索
  const handleSearch = async () => {
    if (!searchKeyword.trim()) return;
    setSearching(true);
    setSearchResults([]);

    try {
      const AMap = await loadAMap();
      const placeSearch = new AMap.PlaceSearch({
        city: '长春',
        citylimit: true,
        pageSize: 15,
        pageIndex: 1,
      });

      placeSearch.search(searchKeyword, (status: string, result: any) => {
        setSearching(false);
        if (status === 'complete' && result.poiList && result.poiList.pois) {
          const pois: POIResult[] = result.poiList.pois.map((poi: any) => ({
            id: poi.id,
            name: poi.name,
            address: poi.address || poi.name,
            tel: poi.tel || '',
            lng: poi.location.getLng(),
            lat: poi.location.getLat(),
          }));
          setSearchResults(pois);
        } else {
          showToast('没有找到相关地点');
        }
      });
    } catch (err) {
      setSearching(false);
      showToast('搜索失败：' + (err as Error).message);
    }
  };

  // 选中搜索结果 → 自动填充表单
  const handleSelectPOI = (poi: POIResult) => {
    setName(poi.name);
    setAddress(poi.address);
    setPhone(poi.tel);
    setSelectedLatLng({ lat: poi.lat, lng: poi.lng });

    // 在地图上设置标注
    if (mapInstanceRef.current) {
      loadAMap().then((AMap) => {
        const map = mapInstanceRef.current;
        map.setCenter([poi.lng, poi.lat]);
        map.setZoom(16);
        setClickMarker(AMap, map, poi.lat, poi.lng);
      });
    }

    // 清空搜索结果
    setSearchResults([]);
    setSearchKeyword('');
    showToast('已填充：' + poi.name);
  };

  // 菜品操作
  const addDish = () => setDishes([...dishes, { name: '', price: '', desc: '' }]);
  const removeDish = (idx: number) => setDishes(dishes.filter((_, i) => i !== idx));
  const updateDish = (idx: number, field: keyof Dish, value: string) =>
    setDishes(dishes.map((d, i) => (i === idx ? { ...d, [field]: value } : d)));

  // 提交
  const handleSubmit = async () => {
    if (!name.trim()) { showToast('请输入餐厅名称'); return; }
    if (!selectedLatLng) { showToast('请搜索选择位置，或在地图上点击'); return; }

    setSubmitting(true);

    const { data: restData, error: restError } = await supabase
      .from('restaurants')
      .insert({
        name: name.trim(),
        address: address.trim() || null,
        phone: phone.trim() || null,
        lat: selectedLatLng.lat,
        lng: selectedLatLng.lng,
        category: category || '清真菜',
        avg_price: parseInt(avgPrice) || 0,
        rating: parseFloat(rating) || 5.0,
        description: description.trim() || null,
        meituan_url: meituanUrl.trim() || `https://i.meituan.com/search/?keyword=${encodeURIComponent(name.trim())}`,
        is_active: true,
      })
      .select()
      .single();

    if (restError) {
      showToast('保存失败: ' + restError.message);
      setSubmitting(false);
      return;
    }

    const validDishes = dishes.filter((d) => d.name.trim());
    if (validDishes.length > 0 && restData) {
      await supabase.from('dishes').insert(
        validDishes.map((d, i) => ({
          restaurant_id: restData.id,
          name: d.name.trim(),
          price: parseInt(d.price) || 0,
          description: d.desc.trim() || null,
          is_signature: i === 0,
          sort_order: i,
        }))
      );
    }

    showToast('餐厅添加成功！');
    setSubmitting(false);

    // 重置
    setName(''); setAddress(''); setPhone(''); setAvgPrice('');
    setDescription(''); setMeituanUrl('');
    setDishes([{ name: '', price: '', desc: '' }]);
    setSelectedLatLng(null);
    if (clickMarkerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.remove(clickMarkerRef.current);
      clickMarkerRef.current = null;
    }

    router.refresh();
    setTimeout(() => router.push('/'), 1500);
  };

  // 删除餐厅
  const handleDelete = async (id: string) => {
    if (!confirm('确定删除这家餐厅吗？关联的菜品和评论也会一起删除。')) return;
    const { error } = await supabase.from('restaurants').delete().eq('id', id);
    if (error) { showToast('删除失败: ' + error.message); return; }
    setRestaurants(restaurants.filter((r) => r.id !== id));
    showToast('已删除');
    router.refresh();
  };

  return (
    <div style={{ paddingBottom: 20 }}>
      {/* POI 搜索 */}
      <div style={{ margin: '0 12px 16px' }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 3, height: 16, background: '#0F6E56', borderRadius: 2, display: 'inline-block' }} />
          搜索餐厅（高德 POI 自动填充）
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="form-input"
            style={{ flex: 1 }}
            placeholder="输入餐厅名称，如：南来顺清真"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            disabled={searching}
            style={{
              flexShrink: 0, padding: '0 20px',
              background: '#0F6E56', color: '#fff',
              border: 'none', borderRadius: 8, cursor: 'pointer',
              fontSize: 14, fontWeight: 500,
            }}
          >
            {searching ? '搜索中...' : '搜索'}
          </button>
        </div>

        {/* 搜索结果列表 */}
        {searchResults.length > 0 && (
          <div style={{ marginTop: 8, background: '#fff', borderRadius: 10, border: '1px solid #e0e0e0', overflow: 'hidden' }}>
            {searchResults.map((poi) => (
              <div
                key={poi.id}
                onClick={() => handleSelectPOI(poi)}
                style={{
                  padding: '10px 14px', cursor: 'pointer',
                  borderBottom: '1px solid #f5f5f5',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#E1F5EE')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
              >
                <div style={{ fontSize: 14, fontWeight: 500 }}>{poi.name}</div>
                <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                  {poi.address}{poi.tel ? ' · ' + poi.tel : ''}
                </div>
              </div>
            ))}
            <div style={{ padding: '8px 14px', fontSize: 12, color: '#bbb', textAlign: 'center' }}>
              点击结果自动填充表单 · 或在地图上手动选位置
            </div>
          </div>
        )}
      </div>

      {/* 地图选位置 */}
      <div style={{ margin: '0 12px 16px' }}>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6, color: '#666' }}>
          地图位置（搜索后自动定位，也可手动点击）
        </div>
        <div style={{ height: 280, borderRadius: 12, overflow: 'hidden', border: '1px solid #e0e0e0' }}>
          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        </div>
        {selectedLatLng && (
          <div style={{ marginTop: 6, fontSize: 12, color: '#0F6E56', background: '#E1F5EE', padding: '4px 10px', borderRadius: 6 }}>
            ✓ 坐标：{selectedLatLng.lat.toFixed(6)}, {selectedLatLng.lng.toFixed(6)}
          </div>
        )}
        {!selectedLatLng && (
          <div style={{ marginTop: 6, fontSize: 12, color: '#E53935' }}>
            请搜索餐厅或在地图上点击选择位置
          </div>
        )}
      </div>

      {/* 表单 */}
      <div style={{ margin: '0 12px 16px', background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #f0f0f0' }}>
        <div className="form-group">
          <label className="form-label">餐厅名称 *</label>
          <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="如：南来顺清真饭店" />
        </div>
        <div className="form-group">
          <label className="form-label">地址</label>
          <input className="form-input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="如：朝阳区牡丹街646号" />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">电话</label>
            <input className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="如：0431-85112345" />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">人均（元）</label>
            <input className="form-input" type="number" value={avgPrice} onChange={(e) => setAvgPrice(e.target.value)} placeholder="如：45" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">菜系</label>
            <select className="form-input" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="清真菜">清真菜</option>
              <option value="清真早餐">清真早餐</option>
              <option value="清真面食">清真面食</option>
              <option value="清真火锅">清真火锅</option>
              <option value="清真小吃">清真小吃</option>
              <option value="清真家常菜">清真家常菜</option>
              <option value="西北菜">西北菜</option>
              <option value="新疆菜">新疆菜</option>
              <option value="烤肉">烤肉</option>
              <option value="其他">其他</option>
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">评分（0-5）</label>
            <input className="form-input" type="number" step="0.1" min="0" max="5" value={rating} onChange={(e) => setRating(e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">简介</label>
          <textarea className="form-textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="餐厅特色介绍（选填）" />
        </div>
        <div className="form-group">
          <label className="form-label">美团链接（选填）</label>
          <input className="form-input" value={meituanUrl} onChange={(e) => setMeituanUrl(e.target.value)} placeholder="留空则自动生成搜索链接" />
        </div>

        {/* 菜品 */}
        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 14, marginTop: 4 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 3, height: 16, background: '#0F6E56', borderRadius: 2, display: 'inline-block' }} />
              招牌菜品
            </span>
            <button onClick={addDish} style={{ fontSize: 13, color: '#0F6E56', background: '#E1F5EE', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}>
              + 添加菜品
            </button>
          </div>
          {dishes.map((dish, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
              <input className="form-input" style={{ flex: 2 }} placeholder="菜名" value={dish.name} onChange={(e) => updateDish(idx, 'name', e.target.value)} />
              <input className="form-input" style={{ flex: 1, minWidth: 70 }} type="number" placeholder="价格" value={dish.price} onChange={(e) => updateDish(idx, 'price', e.target.value)} />
              <input className="form-input" style={{ flex: 3 }} placeholder="描述（选填）" value={dish.desc} onChange={(e) => updateDish(idx, 'desc', e.target.value)} />
              {dishes.length > 1 && (
                <button onClick={() => removeDish(idx)} style={{ flexShrink: 0, width: 36, height: 36, border: 'none', background: '#fee', color: '#E53935', borderRadius: 8, cursor: 'pointer', fontSize: 18 }}>×</button>
              )}
            </div>
          ))}
        </div>

        <button className="submit-btn" onClick={handleSubmit} disabled={submitting} style={{ marginTop: 16 }}>
          {submitting ? '保存中...' : '保存餐厅'}
        </button>
      </div>

      {/* 已有餐厅列表 */}
      <div style={{ margin: '0 12px' }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 3, height: 16, background: '#0F6E56', borderRadius: 2, display: 'inline-block' }} />
          已有餐厅（{restaurants.length} 家）
        </div>
        {restaurants.map((r) => (
          <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', borderRadius: 10, padding: '10px 14px', marginBottom: 6, border: '1px solid #f0f0f0' }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{r.name}</span>
              <span style={{ fontSize: 12, color: '#999', marginLeft: 8 }}>{r.category}</span>
            </div>
            <button onClick={() => handleDelete(r.id)} style={{ fontSize: 12, color: '#E53935', background: '#fee', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
              删除
            </button>
          </div>
        ))}
      </div>

      {toast && <div className="toast show">{toast}</div>}
    </div>
  );
}
