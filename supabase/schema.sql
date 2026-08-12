-- ============================================================
-- 清真餐厅地图 - 数据库 Schema
-- 在 Supabase 项目 → SQL Editor 中执行此脚本
-- ============================================================

-- 启用 UUID 扩展
create extension if not exists "uuid-ossp";

-- ============== 餐厅表 ==============
create table if not exists public.restaurants (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  address text,
  phone text,
  lat double precision not null,
  lng double precision not null,
  category text,                          -- 菜系：西北菜 / 面食 / 火锅 等
  avg_price integer default 0,           -- 人均消费（元）
  rating numeric(2,1) default 5.0,       -- 综合评分 0-5
  description text,                       -- 简介
  cover_url text,                         -- 封面图
  meituan_url text,                       -- 美团跳转链接
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists restaurants_lat_lng_idx on public.restaurants (lat, lng);
create index if not exists restaurants_category_idx on public.restaurants (category);

-- ============== 菜品表 ==============
create table if not exists public.dishes (
  id uuid default uuid_generate_v4() primary key,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  description text,
  price integer not null,
  is_signature boolean default false,    -- 是否招牌菜
  sort_order integer default 0,
  created_at timestamptz default now()
);

create index if not exists dishes_restaurant_idx on public.dishes (restaurant_id);

-- ============== 评论表 ==============
create table if not exists public.reviews (
  id uuid default uuid_generate_v4() primary key,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_name text not null default '匿名用户',
  user_avatar text,
  rating smallint not null check (rating between 1 and 5),
  content text not null,
  photos text[] default '{}',             -- 评论图片 URL 数组
  user_id uuid references auth.users(id) on delete set null,  -- 关联 auth 用户，便于后续权限
  created_at timestamptz default now()
);

create index if not exists reviews_restaurant_idx on public.reviews (restaurant_id, created_at desc);

-- ============== RLS 行级安全策略 ==============
alter table public.restaurants enable row level security;
alter table public.dishes enable row level security;
alter table public.reviews enable row level security;

-- 餐厅 / 菜品：所有人可读，仅认证用户可写
drop policy if exists "restaurants_read_all" on public.restaurants;
create policy "restaurants_read_all" on public.restaurants for select using (true);

drop policy if exists "restaurants_write_auth" on public.restaurants;
create policy "restaurants_write_auth" on public.restaurants for all using (auth.role() = 'authenticated');

drop policy if exists "dishes_read_all" on public.dishes;
create policy "dishes_read_all" on public.dishes for select using (true);

drop policy if exists "dishes_write_auth" on public.dishes;
create policy "dishes_write_auth" on public.dishes for all using (auth.role() = 'authenticated');

-- 评论：所有人可读
drop policy if exists "reviews_read_all" on public.reviews;
create policy "reviews_read_all" on public.reviews for select using (true);

-- 评论：认证用户可写（匿名阶段允许 anon 写入方便联调，正式上线需开启）
drop policy if exists "reviews_insert_all" on public.reviews;
create policy "reviews_insert_all" on public.reviews for insert with check (true);

-- 评论：登录用户可更新/删除自己的
drop policy if exists "reviews_update_own" on public.reviews;
create policy "reviews_update_own" on public.reviews for update using (auth.uid() = user_id);

drop policy if exists "reviews_delete_own" on public.reviews;
create policy "reviews_delete_own" on public.reviews for delete using (auth.uid() = user_id);

-- ============== Storage: 评论图片 Bucket ==============
-- 在 Supabase 控制台 → Storage 中手动创建名为 "review-photos" 的公开 bucket
-- 然后执行：
--   create policy "review_photos_read_all" on storage.objects
--     for select using ( bucket_id = 'review-photos' );
--   create policy "review_photos_insert_auth" on storage.objects
--     for insert with check ( bucket_id = 'review-photos' and auth.role() = 'authenticated' );

-- ============== 初始数据：14 家餐厅 ==============
-- #1-6: 用户实拍照片识别（地址待补，坐标为占位）
-- #7-14: 初始预设数据（待验证后调整）
insert into public.restaurants (name, address, phone, lat, lng, category, avg_price, rating, meituan_url) values
  -- 用户实拍照片识别（6家）
  ('南来顺清真饭店', '朝阳区牡丹街646号(鸿宾胡同)', null, 43.8270, 125.2960, '清真早餐', 25, 4.5, 'https://www.meituan.com/search/?keyword=南来顺清真饭店'),
  ('鸿记菜馆', '地址待补', null, 43.8255, 125.2935, '清真家常菜', 50, 4.3, 'https://www.meituan.com/search/?keyword=鸿记菜馆'),
  ('叼啃dei手撕鸡架', '地址待补(旗靓店001)', null, 43.8275, 125.2920, '清真小吃', 30, 4.4, 'https://www.meituan.com/search/?keyword=叼啃dei手撕鸡架'),
  ('羊羯子火锅', '地址待补', null, 43.8245, 125.2975, '清真火锅', 80, 4.5, 'https://www.meituan.com/search/?keyword=羊羯子火锅长春'),
  ('杨家巧面馆', '地址待补', '17177400899', 43.8230, 125.2955, '清真面食', 20, 4.2, 'https://www.meituan.com/search/?keyword=杨家巧面馆'),
  ('葛记回族烧饼铺', '地址待补', null, 43.8265, 125.2900, '清真小吃', 10, 4.4, 'https://www.meituan.com/search/?keyword=葛记回族烧饼铺'),
  -- 初始预设数据（8家）
  ('老西北清真餐厅', '朝阳区前进大街2688号', '0431-85112345', 43.8285, 125.2985, '西北菜', 45, 4.5, 'https://www.meituan.com/search/?keyword=老西北清真餐厅'),
  ('兰州牛肉面(吉大店)', '朝阳区解放大路123号', '0431-85667890', 43.8240, 125.2915, '面食', 22, 4.2, 'https://www.meituan.com/search/?keyword=兰州牛肉面吉大店'),
  ('西北清真大盘鸡', '朝阳区前进大街与靖宇路交汇', '0431-85990011', 43.8305, 125.3005, '西北菜', 55, 4.3, 'https://www.meituan.com/search/?keyword=西北清真大盘鸡长春'),
  ('清真烤肉坊', '朝阳区桂林路胡同15号', '0431-85223456', 43.8220, 125.2970, '烤肉', 50, 4.6, 'https://www.meituan.com/search/?keyword=清真烤肉坊长春'),
  ('宁夏手抓羊肉馆', '南关区亚泰大街4099号', '0431-88776655', 43.8280, 125.3045, '西北菜', 60, 4.4, 'https://www.meituan.com/search/?keyword=宁夏手抓羊肉馆长春'),
  ('新疆风味餐厅', '朝阳区西民主大街9号', '0431-85443322', 43.8200, 125.2995, '新疆菜', 38, 4.1, 'https://www.meituan.com/search/?keyword=新疆风味餐厅长春'),
  ('马家清真拉面', '朝阳区隆礼路与百汇街交汇', '0431-85119988', 43.8315, 125.2930, '面食', 20, 4.0, 'https://www.meituan.com/search/?keyword=马家清真拉面长春'),
  ('清真绿洲餐厅', '朝阳区致远街55号', '0431-85338877', 43.8255, 125.2885, '清真菜', 48, 4.3, 'https://www.meituan.com/search/?keyword=清真绿洲餐厅长春');

-- ============================================================
-- 执行完成后，请到 Supabase → Table Editor 检查数据
-- ============================================================