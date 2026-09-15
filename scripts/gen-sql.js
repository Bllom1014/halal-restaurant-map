// Generate Supabase INSERT SQL from geocoded restaurant data.
const fs = require('fs');
const data = require('/tmp/geo_result.json');

function esc(s) {
  return String(s == null ? '' : s).replace(/'/g, "''");
}

const lines = [];
lines.push(`-- ============================================================`);
lines.push(`-- 长春清真餐厅批量导入（207 家，坐标来自高德 POI/地址解析）`);
lines.push(`-- 执行：Supabase Dashboard → SQL Editor → 粘贴运行`);
lines.push(`-- ============================================================`);
lines.push('');
lines.push(`-- 1) 清理旧的占位/假数据（保留真实数据）`);
lines.push(`delete from public.dishes where restaurant_id in (`);
lines.push(`  select id from public.restaurants where phone like '0431-%' or address like '地址待补%'`);
lines.push(`);`);
lines.push(`delete from public.restaurants where phone like '0431-%' or address like '地址待补%';`);
lines.push('');
lines.push(`-- 2) 插入 207 家`);
lines.push(`insert into public.restaurants (name, address, phone, lat, lng, category, avg_price, rating, meituan_url, description) values`);

const values = data.map((r, i) => {
  const name = esc(r.name);
  const addr = esc(r.address);
  const lat = Number(r.lat).toFixed(6);
  const lng = Number(r.lng).toFixed(6);
  const cat = esc(r.category);
  const price = r.avg_price || 0;
  const rating = Number(r.rating).toFixed(1);
  const mt = `https://www.meituan.com/search/?keyword=${encodeURIComponent(r.name)}`;
  const desc = esc(r.signature || '');
  const end = i === data.length - 1 ? ';' : ',';
  return `  ('${name}', '${addr}', null, ${lat}, ${lng}, '${cat}', ${price}, ${rating}, '${mt}', '${desc}')${end}`;
});
lines.push(values.join('\n'));
lines.push('');
lines.push(`-- 3) 校验`);
lines.push(`select count(*) as total, category from public.restaurants group by category order by category;`);
lines.push('');

fs.writeFileSync(__dirname + '/../supabase/import-changchun-halal.sql', lines.join('\n'));
console.log('written import-changchun-halal.sql');
console.log('rows:', data.length);
// sanity: any duplicate coords?
const coord = {};
let dup = 0;
data.forEach(r => { const k = Number(r.lat).toFixed(4)+','+Number(r.lng).toFixed(4); coord[k]=(coord[k]||0)+1; if(coord[k]===2) dup++; });
console.log('duplicate coord groups:', dup);
