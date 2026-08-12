# 长春清真餐厅地图网站 · 技术方案

> 以吉林大学为中心，展示周边清真餐厅的多人共享平台

## 1. 项目概述

### 1.1 目标用户

吉林大学及周边高校学生、教职工，以及对清真餐饮有需求的用户群体。

### 1.2 核心功能

| 功能   | 说明                        |
| ---- | ------------------------- |
| 地图首页 | 以学校为中心，腾讯地图上标注餐厅位置，点击查看概要 |
| 餐厅列表 | 按距离/评分/人均排序，支持搜索筛选        |
| 餐厅详情 | 招牌菜品、地址电话、美团优惠券/团购跳转      |
| 用户评论 | 图文评论（评分+文字+照片），数据持久化      |
| 多人共享 | 用户注册登录，人人可发评论、上传照片        |

### 1.3 技术选型总览

| 层级   | 技术                      | 选型理由                                |
| ---- | ----------------------- | ----------------------------------- |
| 前端框架 | Next.js 14 + TypeScript | SSR/SSG、SEO 友好、API Routes 内置        |
| 地图服务 | 腾讯地图 GL JS              | 国内合规、免密钥代理、标注/InfoWindow 支持         |
| 后端服务 | Supabase                | 免费层、PostgreSQL + Auth + Storage 一站式 |
| 美团对接 | 美团联盟链接                  | 无需企业资质、跳转领券、最快上线                    |
| 部署   | Vercel + Supabase Cloud | 均有免费层、零运维                           |

---

## 2. 数据库设计

使用 Supabase 内置的 PostgreSQL，共 4 张表：

### 2.1 restaurants（餐厅表）

```sql
CREATE TABLE restaurants (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    lat         DECIMAL(10,6) NOT NULL,    -- GCJ-02 坐标
    lng         DECIMAL(10,6) NOT NULL,
    address     VARCHAR(200) NOT NULL,
    phone       VARCHAR(30),
    rating      DECIMAL(2,1) DEFAULT 0,    -- 平均评分（冗余字段，定期更新）
    avg_price   INTEGER DEFAULT 0,          -- 人均价格（元）
    category    VARCHAR(20),                -- 菜系：西北菜/面食/烤肉/新疆菜/清真菜
    meituan_url TEXT,                       -- 美团联盟跳转链接
    cover_image TEXT,                       -- 封面图 URL（Supabase Storage）
    status      VARCHAR(10) DEFAULT 'active', -- active/pending/hidden
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.2 dishes（菜品表）

```sql
CREATE TABLE dishes (
    id            SERIAL PRIMARY KEY,
    restaurant_id INTEGER REFERENCES restaurants(id) ON DELETE CASCADE,
    name          VARCHAR(50) NOT NULL,
    price         INTEGER NOT NULL,          -- 价格（元）
    description   TEXT,
    image_url     TEXT,                      -- 菜品图片（Supabase Storage）
    sort_order    INTEGER DEFAULT 0,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.3 reviews（评论表）

```sql
CREATE TABLE reviews (
    id            SERIAL PRIMARY KEY,
    restaurant_id INTEGER REFERENCES restaurants(id) ON DELETE CASCADE,
    user_id       UUID REFERENCES auth.users(id),
    user_name     VARCHAR(50) NOT NULL,
    rating        INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    content       TEXT NOT NULL,
    photo_urls    TEXT[],                    -- 照片 URL 数组（Supabase Storage）
    created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.4 favorites（收藏表，可选）

```sql
CREATE TABLE favorites (
    id            SERIAL PRIMARY KEY,
    user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    restaurant_id INTEGER REFERENCES restaurants(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, restaurant_id)
);
```

### 2.5 RLS 行级安全策略

```sql
-- 餐厅：所有人可读，仅管理员可写
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "restaurants_read" ON restaurants FOR SELECT USING (status = 'active');
CREATE POLICY "restaurants_admin_write" ON restaurants FOR ALL
    USING (auth.jwt() ->> 'role' = 'admin');

-- 评论：所有人可读，登录用户可写自己的
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_read" ON reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert" ON reviews FOR INSERT
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews_update_own" ON reviews FOR UPDATE
    USING (auth.uid() = user_id);
CREATE POLICY "reviews_delete_own" ON reviews FOR DELETE
    USING (auth.uid() = user_id);
```

---

## 3. API 设计

Next.js API Routes（`/app/api/`），前后端同源。

### 3.1 餐厅相关

| 方法   | 路径                     | 说明                                             |
| ---- | ---------------------- | ---------------------------------------------- |
| GET  | `/api/restaurants`     | 获取餐厅列表，支持 `?sort=distance&lat=&lng=&category=` |
| GET  | `/api/restaurants/:id` | 获取单个餐厅详情（含菜品）                                  |
| POST | `/api/restaurants`     | 提交新餐厅（需登录，status=pending 待审核）                  |
| PUT  | `/api/restaurants/:id` | 编辑餐厅（仅管理员）                                     |

### 3.2 评论相关

| 方法     | 路径                             | 说明              |
| ------ | ------------------------------ | --------------- |
| GET    | `/api/restaurants/:id/reviews` | 获取餐厅评论列表        |
| POST   | `/api/restaurants/:id/reviews` | 发表评论（需登录，含照片上传） |
| DELETE | `/api/reviews/:id`             | 删除自己的评论         |

### 3.3 文件上传

| 方法   | 路径            | 说明                              |
| ---- | ------------- | ------------------------------- |
| POST | `/api/upload` | 上传图片到 Supabase Storage，返回公开 URL |

### 3.4 响应格式

```json
{
    "code": 0,
    "data": { ... },
    "message": "success"
}
```

---

## 4. 页面功能详述

### 4.1 首页：地图视图 `/`

**布局**：全屏腾讯地图，顶部浮动信息卡片显示学校名称。

**交互**：

- 地图中心为学校坐标，缩放级别 14
- 餐厅以自定义图标标注（绿色定位针），学校用蓝色定位针
- 点击餐厅标注 → 弹出 InfoWindow：名称、评分、人均、距离、"查看详情"按钮
- 点击学校标注 → 弹出 InfoWindow：学校名称 + 周边餐厅数量
- 底部导航栏切换"地图/列表"

**地图合规要点**：

- 使用腾讯地图 GL JS（不可用 Google Maps / Mapbox / OSM）
- 坐标系统 GCJ-02（火星坐标）
- 开发阶段通过 WorkBuddy 代理免密钥使用
- 生产环境需在腾讯位置服务开放平台申请 key，配置 Referer 白名单

### 4.2 列表页 `/restaurants`

**布局**：顶部搜索栏 + 排序按钮 + 餐厅卡片列表。

**功能**：

- 搜索框：按餐厅名称或菜系实时过滤
- 排序：距离最近（默认）/ 评分最高 / 人均最低
- 每张卡片显示：名称、评分、菜系标签、人均、距离、地址
- 点击卡片跳转详情页

**距离计算**：使用 Haversine 公式，根据学校坐标和餐厅坐标计算直线距离。

### 4.3 详情页 `/restaurants/:id`

**布局**：自上而下依次为：

1. **返回按钮**：返回上一页（地图或列表）
2. **餐厅标题**：名称 + 评分 + 人均 + 距离 + 菜系标签
3. **基本信息卡片**：地址、电话
4. **在地图上查看**按钮：跳转地图并居中到该餐厅
5. **招牌菜品**：菜品名 + 描述 + 价格
6. **美团入口**：醒目的黄色按钮，跳转美团联盟链接
7. **用户评论列表**：头像 + 昵称 + 评分 + 日期 + 文字 + 照片
8. **发表评论表单**：星级选择 + 昵称 + 评论内容 + 照片上传 + 提交

### 4.4 用户认证 `/auth`

- 登录方式：手机号验证码 / 微信扫码（Supabase Auth 支持）
- 未登录用户可浏览地图、列表、详情
- 登录后可发表评论、上传照片、收藏餐厅

---

## 5. 美团联盟对接

### 5.1 对接方式

采用**联盟跳转链接**模式，最简单快速：

1. 注册美团联盟账号（<https://union.meituan.com）>
2. 获取推广位 PID
3. 生成餐厅搜索链接：`https://www.meituan.com/search/?keyword=餐厅名`
4. 或通过美团联盟 API 生成带 PID 的追踪链接

### 5.2 链接生成逻辑

```
用户点击"去美团领优惠券" 
  → 跳转 https://www.meituan.com/search/?keyword=老西北清真餐厅
  → 用户在美团页面领取优惠券/购买团购
  → 产生订单后联盟后台记录佣金
```

### 5.3 后续升级路径

如有企业资质，可申请美团开放平台 API，实现：

- 站内展示优惠券详情（折扣金额、使用条件）
- 直接展示团购套餐内容
- 实时库存和价格

---

## 6. 部署方案

### 6.1 前端部署（Vercel）

```bash
# 1. 推送代码到 GitHub
git push origin main

# 2. Vercel 自动部署
#    - 连接 GitHub 仓库
#    - 框架预设：Next.js
#    - 环境变量：SUPABASE_URL, SUPABASE_ANON_KEY, TENCENT_MAP_KEY
```

### 6.2 后端部署（Supabase Cloud）

1. 注册 Supabase 账号（<https://supabase.com）>
2. 创建新项目，选择东京/新加坡区域（离中国最近）
3. 在 SQL Editor 中执行建表语句
4. 在 Storage 中创建 `review-photos` 和 `restaurant-images` 桶
5. 在 Authentication 中启用手机号/微信登录方式
6. 获取 Project URL 和 anon key，填入前端环境变量

### 6.3 地图密钥

1. 注册腾讯位置服务账号（<https://lbs.qq.com）>
2. 创建应用 → 添加 key
3. 配置 Referer 白名单（你的 Vercel 域名）
4. 将 key 填入前端环境变量 `TENCENT_MAP_KEY`
5. 生产环境建议通过后端代理 key（防止前端泄露）

### 6.4 费用预估

| 服务            | 免费额度                           | 预估月费      |
| ------------- | ------------------------------ | --------- |
| Vercel Hobby  | 100GB 带宽/月                     | ¥0（初期足够）  |
| Supabase Free | 500MB 数据库 + 1GB 存储 + 50000 MAU | ¥0（初期足够）  |
| 腾讯地图          | 10000 次/日                      | ¥0（初期足够）  |
| 域名（可选）        | -                              | ¥50-100/年 |

---

## 7. 开发路线图

### Phase 1：MVP 原型（当前已完成）

- [x] 地图首页（腾讯地图 + 餐厅标注 + InfoWindow）
- [x] 列表页（搜索 + 三种排序）
- [x] 详情页（菜品 + 美团链接 + 评论）
- [x] 评论功能（评分 + 文字 + 照片上传，localStorage 持久化）
- [x] 8 家 mock 餐厅数据

### Phase 2：接入真实后端（1-2 周）

- [ ] 注册 Supabase 账号，创建数据库
- [ ] 执行建表 SQL，配置 RLS 策略
- [ ] 前端接入 Supabase JS SDK
- [ ] 餐厅数据从数据库读取（替换 mock 数据）
- [ ] 评论存储到 Supabase（替换 localStorage）
- [ ] 图片上传到 Supabase Storage
- [ ] 用户注册/登录（Supabase Auth）

### Phase 3：上线部署（3-5 天）

- [ ] 申请腾讯地图 key
- [ ] 注册美团联盟账号，生成推广链接
- [ ] 部署到 Vercel
- [ ] 绑定自定义域名
- [ ] 配置环境变量

### Phase 4：功能增强（后续迭代）

- [x] 餐厅提交功能（用户可提交新餐厅，管理员审核）
- [x] 评论点赞/回复
- [x] [ | 收藏餐厅功能
- [x] 路线规划（学校到餐厅的导航）
- [ ] 更多学校支持（多中心切换）
- [ ] PWA 离线支持
- [ ] 美团 API 深度对接（需企业资质）

---

## 8. 项目结构

```
halal-restaurant-map/
├── app/
│   ├── layout.tsx              # 全局布局
│   ├── page.tsx                # 首页（地图）
│   ├── restaurants/
│   │   ├── page.tsx            # 列表页
│   │   └── [id]/
│   │       └── page.tsx        # 详情页
│   ├── auth/
│   │   └── page.tsx            # 登录页
│   └── api/
│       ├── restaurants/
│       │   ├── route.ts        # GET/POST 餐厅
│       │   └── [id]/
│       │       ├── route.ts    # GET/PUT 单个餐厅
│       │       └── reviews/
│       │           └── route.ts # GET/POST 评论
│       └── upload/
│           └── route.ts        # 图片上传
├── components/
│   ├── MapView.tsx             # 地图组件
│   ├── RestaurantCard.tsx      # 餐厅卡片
│   ├── RestaurantList.tsx      # 列表组件
│   ├── ReviewForm.tsx          # 评论表单
│   ├── ReviewList.tsx          # 评论列表
│   └── StarRating.tsx          # 星级评分
├── lib/
│   ├── supabase.ts             # Supabase 客户端
│   ├── tencent-map.ts          # 腾讯地图工具函数
│   └── distance.ts             # 距离计算
├── types/
│   └── index.ts                # TypeScript 类型定义
├── .env.local                  # 环境变量
├── next.config.js
├── package.json
└── PLAN.md                     # 本文档
```

---

## 9. 关键注意事项

1. **地图合规**：必须使用腾讯地图/高德/百度/天地图，禁止使用 Google Maps、Mapbox、OSM 等境外地图服务。坐标系统使用 GCJ-02。
2. **美团链接**：联盟链接需要通过审核后才能正常跳转，初期可先用普通搜索链接过渡。
3. **图片存储**：用户上传的照片需压缩后再存储（建议最大宽度 800px，JPEG 70% 质量），避免存储费用过高。
4. **数据安全**：RLS 策略确保用户只能修改/删除自己的评论，餐厅数据只有管理员可以编辑。
5. **性能优化**：列表页使用服务端渲染（SSR），详情页使用静态生成（SSG）+ 增量静态再生（ISR）。
