-- ============================================================
-- 批量添加餐厅模板
-- 使用方法：
-- 1. 复制下面的 INSERT 语句
-- 2. 替换为你自己的餐厅信息
-- 3. 经纬度获取方法：打开 https://www.openstreetmap.org
--    搜索餐厅地址，右键点地图上的位置 → "显示地址" 会显示坐标
--    格式是：纬度,经度（如 43.8261,125.2948）
-- 4. 在 Supabase → SQL Editor 中粘贴执行
-- ============================================================

-- ========= 示例：添加一家餐厅 + 菜品 =========
-- 先插入餐厅，拿到 id
-- 再插入菜品，关联 restaurant_id

-- 方法一：单家添加（推荐）

insert into public.restaurants (name, address, phone, lat, lng, category, avg_price, rating, description, meituan_url)
values (
  '餐厅名称',                          -- 替换为真实名称
  '长春市朝阳区某某路XX号',             -- 替换为真实地址
  '0431-XXXXXXXX',                     -- 替换为电话（没有就写 null）
  43.8261,                             -- 纬度（从 openstreetmap 获取）
  125.2948,                            -- 经度（从 openstreetmap 获取）
  '清真菜',                             -- 菜系分类
  45,                                  -- 人均消费（元）
  4.5,                                 -- 评分（0-5）
  '餐厅简介',                           -- 简介（没有就写 null）
  'https://www.meituan.com/search/?keyword=餐厅名称'  -- 美团链接
);

-- 如果要同时添加菜品，先在上面的 insert 末尾加上 returning id
-- 然后用返回的 id 插入菜品：
-- insert into public.dishes (restaurant_id, name, price, description, is_signature)
-- values (
--   '上一步返回的餐厅id',
--   '招牌菜名称',
--   38,
--   '菜品描述',
--   true
-- );

-- ========= 方法二：批量添加（一次多家） =========

-- insert into public.restaurants (name, address, phone, lat, lng, category, avg_price, rating, meituan_url) values
--   ('餐厅A', '地址A', '电话A', 43.8200, 125.2900, '清真菜', 40, 4.3, 'https://www.meituan.com/search/?keyword=餐厅A'),
--   ('餐厅B', '地址B', '电话B', 43.8300, 125.3000, '清真面食', 20, 4.5, 'https://www.meituan.com/search/?keyword=餐厅B'),
--   ('餐厅C', '地址C', null, 43.8250, 125.2950, '清真小吃', 15, 4.2, 'https://www.meituan.com/search/?keyword=餐厅C');

-- ========= 方法三：清空所有餐厅重新开始 =========
-- 警告：这会删除所有餐厅、菜品和评论！
-- delete from public.restaurants;

-- ========= 方法四：删除指定餐厅 =========
-- delete from public.restaurants where name = '要删除的餐厅名';

-- ========= 方法五：修改餐厅信息 =========
-- update public.restaurants set address = '新地址', avg_price = 50 where name = '餐厅名';
