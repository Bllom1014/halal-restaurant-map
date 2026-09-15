// 直接通过 Supabase REST API 导入 207 家长春清真餐厅
// 用 Node.js fetch（绕过沙箱代理，直连成功）
const fs = require('fs');

// 从环境变量读取（运行前先加载 .env.local）
// 用法: node --env-file=.env.local scripts/import-supabase.js <geo_result.json 路径>
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const API_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !API_KEY) {
  console.error('缺少 Supabase 环境变量。请用: node --env-file=.env.local scripts/import-supabase.js');
  process.exit(1);
}
const HEADERS = {
  'apikey': API_KEY,
  'Authorization': 'Bearer ' + API_KEY,
  'Content-Type': 'application/json',
};

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const geoPath = process.argv[2] || '/tmp/geo_result.json';
  const geo = JSON.parse(fs.readFileSync(geoPath, 'utf8'));
  console.log('准备导入:', geo.length, '家餐厅');

  // ---- Step 1: 删除所有现有数据 ----
  console.log('\n[1/3] 清理旧数据...');
  // PostgREST 需要有 filter 才能 DELETE，用 neq 全0uuid 匹配所有
  const delRes = await fetch(
    `${SUPABASE_URL}/rest/v1/restaurants?id=neq.00000000-0000-0000-0000-000000000000`,
    { method: 'DELETE', headers: HEADERS }
  );
  console.log('  DELETE status:', delRes.status, delRes.ok ? '✓' : '✗');

  // ---- Step 2: 映射字段 + 分批插入 ----
  console.log('\n[2/3] 批量插入新数据...');
  const records = geo.map(r => ({
    name: r.name,
    address: r.address,
    lat: r.lat,
    lng: r.lng,
    category: r.category,
    avg_price: r.avg_price || 0,
    rating: r.rating || 5.0,
    description: r.signature || null,
    meituan_url: 'https://www.meituan.com/search/?keyword=' + encodeURIComponent(r.name),
    is_active: true,
  }));

  let inserted = 0;
  const BATCH = 50;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/restaurants`, {
      method: 'POST',
      headers: { ...HEADERS, 'Prefer': 'return=representation' },
      body: JSON.stringify(batch),
    });
    if (res.ok) {
      inserted += batch.length;
      console.log(`  批次 ${Math.floor(i/BATCH)+1}: +${batch.length} (累计 ${inserted})`);
    } else {
      const errText = await res.text();
      console.error(`  批次 ${Math.floor(i/BATCH)+1} 失败: ${res.status}`, errText.slice(0,300));
    }
    await sleep(200); // 避免限流
  }

  // ---- Step 3: 验证 ----
  console.log('\n[3/3] 验证...');
  const verifyRes = await fetch(
    `${SUPABASE_URL}/rest/v1/restaurants?select=id,name,category&order=category`,
    { headers: HEADERS }
  );
  const verifyData = await verifyRes.json();
  console.log('数据库现有:', verifyData.length, '家');

  // 分类统计
  const cats = {};
  verifyData.forEach(r => cats[r.category] = (cats[r.category] || 0) + 1);
  console.log('\n分类统计:');
  Object.keys(cats).sort().forEach(c => console.log(`  ${c}: ${cats[c]} 家`));

  console.log('\n导入完成!');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
