-- ============================================================
-- 放开 restaurants / dishes 的写入权限（开发阶段用）
-- 在 Supabase → SQL Editor 中执行
-- ============================================================

-- 餐厅：所有人可读写（开发阶段，上线后改为仅认证用户）
drop policy if exists "restaurants_write_all" on public.restaurants;
create policy "restaurants_write_all" on public.restaurants for all using (true) with check (true);

-- 菜品：所有人可读写
drop policy if exists "dishes_write_all" on public.dishes;
create policy "dishes_write_all" on public.dishes for all using (true) with check (true);

-- 评论删除：所有人可删（开发阶段）
drop policy if exists "reviews_delete_all" on public.reviews;
create policy "reviews_delete_all" on public.reviews for delete using (true);
