'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Restaurant, Dish, Review } from '@/types/database';

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

function renderStars(rating: number) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  let html = '';
  for (let i = 0; i < full; i++) html += '<span style="color:#F5A623;">★</span>';
  if (half) html += '<span style="color:#F5A623;">★</span>';
  for (let i = full + (half ? 1 : 0); i < 5; i++) html += '<span style="color:#ddd;">★</span>';
  return html;
}

type Props = {
  restaurant: Restaurant;
  dishes: Dish[];
  reviews: Review[];
};

export default function RestaurantDetail({ restaurant: r, dishes, reviews }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const dist = formatDistance(calculateDistance(SCHOOL.lat, SCHOOL.lng, r.lat, r.lng));

  const [selectedRating, setSelectedRating] = useState(5);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // 美团链接：自动生成的搜索链接 → 用 deeplink scheme 唤起 APP 搜索
  // 用户填的真实团购链接 → 直接用那个 URL
  const meituanHref = (() => {
    if (!r.meituan_url) return '';
    if (!r.meituan_url.includes('meituan.com/search')) return r.meituan_url;
    return `imeituan://www.meituan.com/search?q=${encodeURIComponent(r.name)}`;
  })();

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('图片太大，请选择5MB以内的图片');
      return;
    }
    setPhoto(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photo) return null;
    const ext = photo.name.split('.').pop();
    const path = `${r.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('review-photos').upload(path, photo);
    if (error) {
      console.error('upload error:', error);
      return null;
    }
    const { data: url } = supabase.storage.from('review-photos').getPublicUrl(path);
    return url.publicUrl;
  };

  const submitReview = async () => {
    if (!content.trim()) {
      alert('请输入评论内容');
      return;
    }
    setSubmitting(true);

    let photoUrl: string | null = null;
    if (photo) {
      photoUrl = await uploadPhoto();
    }

    const { error } = await supabase.from('reviews').insert({
      restaurant_id: r.id,
      user_name: name.trim() || '匿名用户',
      rating: selectedRating,
      content: content.trim(),
      photos: photoUrl ? [photoUrl] : []
    });

    setSubmitting(false);

    if (error) {
      alert('提交失败：' + error.message);
      return;
    }

    alert('评论发表成功！');
    router.refresh();
    setName('');
    setContent('');
    setPhoto(null);
    setPhotoPreview('');
  };

  return (
    <>
      <header className="app-header">
        <h1>餐厅详情</h1>
      </header>
      <div className="view">
        <div className="detail-container">
          <button className="detail-back" onClick={() => router.back()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
            返回
          </button>

          <div className="detail-title">{r.name}</div>
          <div className="detail-meta">
            <span style={{ color: '#F5A623', fontWeight: 600 }}>★ {r.rating}</span>
            <span>·</span>
            <span>¥{r.avg_price}/人</span>
            <span>·</span>
            <span>{dist}</span>
            {r.category && (
              <>
                <span>·</span>
                <span className="badge">{r.category}</span>
              </>
            )}
          </div>

          <div className="detail-info">
            <div className="detail-info-row">
              <span className="detail-info-label">地址</span>
              <span>{r.address || '地址待补'}</span>
            </div>
            <div className="detail-info-row">
              <span className="detail-info-label">电话</span>
              <span>{r.phone || '暂无'}</span>
            </div>
          </div>

          <button className="view-on-map-btn" onClick={() => router.push('/')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
            </svg>
            在地图上查看
          </button>

          {dishes.length > 0 && (
            <>
              <div className="section-title">招牌菜品</div>
              {dishes.map((d) => (
                <div key={d.id} className="dish-card">
                  <div className="dish-left">
                    <div className="dish-name">{d.name}</div>
                    <div className="dish-desc">{d.description || ''}</div>
                  </div>
                  <div className="dish-price">¥{d.price}</div>
                </div>
              ))}
            </>
          )}

          {meituanHref && (
            <a className="meituan-btn" href={meituanHref}>
              去美团领优惠券 / 团购 →
            </a>
          )}

          <div className="section-title">
            用户评论 <span className="review-count">({reviews.length}条)</span>
          </div>
          {reviews.length === 0 ? (
            <div className="empty-state">暂无评论，来发第一条吧</div>
          ) : (
            reviews.map((rv) => (
              <div key={rv.id} className="review-card">
                <div className="review-header">
                  <div className="review-user">
                    <div className="review-avatar">{rv.user_name.substring(0, 1)}</div>
                    {rv.user_name}
                  </div>
                  <div className="review-date">
                    {new Date(rv.created_at).toISOString().slice(0, 10)}
                  </div>
                </div>
                <div style={{ marginBottom: 4 }} dangerouslySetInnerHTML={{ __html: renderStars(rv.rating) }} />
                <div className="review-text">{rv.content}</div>
                {rv.photos && rv.photos.length > 0 && rv.photos.map((p, i) => (
                  <img key={i} className="review-photo" src={p} alt="评论图片" />
                ))}
              </div>
            ))
          )}

          <div className="review-form">
            <div className="section-title" style={{ marginBottom: 14 }}>发表评论</div>
            <div className="form-group">
              <label className="form-label">评分</label>
              <div className="rating-input">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`star-btn ${n <= selectedRating ? 'active' : ''}`}
                    onClick={() => setSelectedRating(n)}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">昵称</label>
              <input
                type="text"
                className="form-input"
                placeholder="匿名用户"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">评论内容</label>
              <textarea
                className="form-textarea"
                placeholder="分享你的用餐体验..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">上传照片</label>
              <div className="photo-upload">
                <label className="photo-upload-label">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                  </svg>
                  选择照片
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handlePhoto}
                  />
                </label>
                {photoPreview && <img className="photo-preview" src={photoPreview} alt="预览" />}
              </div>
            </div>
            <button
              className="submit-btn"
              onClick={submitReview}
              disabled={submitting}
            >
              {submitting ? '提交中...' : '发表评论'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}