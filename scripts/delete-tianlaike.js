// Delete 天山来客 from Supabase (user says it doesn't exist / was already deleted)
// 从环境变量读取（运行前先加载 .env.local）
// 用法: node --env-file=.env.local scripts/delete-tianlaike.js
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const API_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !API_KEY) {
  console.error('缺少 Supabase 环境变量。请用: node --env-file=.env.local scripts/delete-tianlaike.js');
  process.exit(1);
}
const HEADERS = {
  'apikey': API_KEY,
  'Authorization': 'Bearer ' + API_KEY,
  'Content-Type': 'application/json',
};

async function main() {
  // Search for 天山来客
  const searchRes = await fetch(
    SUPABASE_URL + '/rest/v1/restaurants?name=like.*%E5%A4%A9%E5%B1%B1%E6%9D%A5%E5%AE%A2*&select=id,name,address',
    { headers: HEADERS }
  );
  const found = await searchRes.json();
  console.log('Found records:', JSON.stringify(found, null, 2));

  if (!found || found.length === 0) {
    console.log('No 天山来客 in database, nothing to delete.');
    return;
  }

  // Delete each match
  for (const r of found) {
    const delRes = await fetch(
      SUPABASE_URL + '/rest/v1/restaurants?id=eq.' + r.id,
      { method: 'DELETE', headers: HEADERS }
    );
    console.log('Deleted "' + r.name + '" (id=' + r.id + '): status=' + delRes.status + (delRes.ok ? ' OK' : ' FAIL'));
  }

  // Verify total count
  const countRes = await fetch(
    SUPABASE_URL + '/rest/v1/restaurants?select=id',
    { headers: HEADERS }
  );
  const countData = await countRes.json();
  console.log('\nDatabase now has:', countData.length, 'restaurants');
}

main().catch(function(e) { console.error('FATAL:', e); process.exit(1); });
