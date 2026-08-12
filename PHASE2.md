# Phase 2 部署指南

清真餐厅地图项目 — 从原型到生产环境上线的完整步骤。

---

## 一、Supabase 后端配置

### 1.1 创建 Supabase 项目

1. 访问 https://supabase.com，使用 GitHub 账号登录
2. 点击 **New Project** 创建新项目
3. 填写：
   - Name: `halal-restaurant-map`（或任意名字）
   - Database Password: 设置一个强密码（务必记住）
   - Region: 选择 `Northeast Asia (Tokyo)` 或最近的区域
4. 等待项目创建完成（约 2 分钟）

### 1.2 获取 API 密钥

项目创建完成后，进入 **Settings → API**，记录：
- `Project URL` — 形如 `https://xxxxx.supabase.co`
- `anon public key` — 一长串以 `eyJ...` 开头的 JWT

### 1.3 执行数据库 Schema

进入 **SQL Editor**，新建查询，把 `supabase/schema.sql` 文件内容全部粘贴进去，点击 **Run** 执行。

执行成功后：
- 进入 **Table Editor** 应能看到 `restaurants` / `dishes` / `reviews` 三张表
- `restaurants` 表中应已包含 6 条初始数据

### 1.4 创建 Storage Bucket

1. 进入 **Storage** → **Create new bucket**
2. 名称：`review-photos`
3. 勾选 **Public bucket**（公开读）
4. 创建后进入 bucket 设置 → Policies，新建两条策略：

```sql
-- 允许所有人查看评论图片
create policy "review_photos_read_all"
on storage.objects for select
using ( bucket_id = 'review-photos' );

-- 仅认证用户可上传
create policy "review_photos_insert_auth"
on storage.objects for insert
with check ( bucket_id = 'review-photos' and auth.role() = 'authenticated' );
```

### 1.5 启用 Authentication

进入 **Authentication → Providers**：
- 启用 Email（默认已开启）
- 如需微信/手机号：在 Providers → Phone 配置短信网关（阿里云/腾讯云）

---

## 二、本地开发启动

### 2.1 安装依赖

```bash
cd halal-restaurant-map
npm install
```

### 2.2 配置环境变量

```bash
cp .env.example .env.local
```

编辑 `.env.local`，填入从 Supabase 复制的值：

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

### 2.3 启动开发服务器

```bash
npm run dev
```

浏览器访问 http://localhost:3000

---

## 三、Vercel 部署（推荐）

### 3.1 推送代码到 GitHub

```bash
cd halal-restaurant-map
git init
git add .
git commit -m "Initial commit: Phase 2 Next.js + Supabase"
git branch -M main
git remote add origin https://github.com/your-username/halal-restaurant-map.git
git push -u origin main
```

### 3.2 在 Vercel 导入项目

1. 访问 https://vercel.com，使用 GitHub 登录
2. 点击 **Import Project**，选择刚才推送的仓库
3. Framework Preset 选择 **Next.js**
4. 在 **Environment Variables** 添加：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. 点击 **Deploy**

部署完成后 Vercel 会分配一个域名（如 `halal-restaurant-map.vercel.app`），可以直接访问。

---

## 四、补充真实数据

### 4.1 更新餐厅地址和坐标

1. 用腾讯地图（https://lbs.qq.com）搜索每家餐厅的实际地址
2. 进入 Supabase → Table Editor → restaurants 表
3. 编辑每条记录：
   - `address`：填入完整地址
   - `lat` / `lng`：填入腾讯地图返回的 GCJ-02 坐标
   - `phone`：填入联系电话
   - `category`：调整菜系分类
   - `avg_price`：人均消费
   - `rating`：综合评分

### 4.2 添加菜品

进入 Table Editor → dishes 表 → Insert row：
- `restaurant_id`：选择关联的餐厅
- `name`：菜品名
- `description`：简介
- `price`：价格
- `is_signature`：是否招牌菜
- `sort_order`：显示顺序

### 4.3 美团跳转链接优化

当前 schema 中的 `meituan_url` 是搜索链接。要换成精准跳转：
1. 在美团/大众点评 APP 中找到店铺页
3. 把 `meituan_url` 改为短链或 H5 链接

如果申请了美团联盟，把链接换成联盟推广链接即可获得佣金。

---

## 五、腾讯地图（生产环境）

原型里的 SVG 地图已经够用，但生产环境建议切换到腾讯地图 GL JS（真实瓦片 + 缩放/拖动）：

1. 访问 https://lbs.qq.com/webservice_v1/guide-location 申请 WebService API Key
2. 把 Key 填入 `.env.local` 的 `NEXT_PUBLIC_TMAP_KEY`
3. 在 `app/components/MapView.tsx` 中替换 SVG 渲染逻辑为腾讯地图 API

---

## 六、当前状态

✅ Next.js 14 项目骨架完成
✅ Supabase 数据库 Schema 完成
✅ 6 家真实餐厅数据已写入初始 SQL
⏳ 等待用户补充：每家餐厅的详细地址 + 精确坐标
⏳ 等待 Supabase 项目创建 + API Key 注入

---

## 七、下一步 Roadmap

| 阶段 | 内容 | 状态 |
|------|------|------|
| Phase 1 | 原型 HTML | ✅ 完成 |
| Phase 2 | Next.js + Supabase 骨架 | ✅ 完成 |
| Phase 3 | 真实数据上线（地址/坐标/菜品）| ⏳ 待你提供地址 |
| Phase 4 | 用户认证（微信/手机号登录）| 待办 |
| Phase 5 | 美团联盟链接对接 | 待办 |
| Phase 6 | 地图升级为腾讯地图 GL JS | 待办 |
| Phase 7 | SEO 优化 + 分享海报 | 待办 |