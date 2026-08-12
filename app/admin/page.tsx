import { createClient } from '@/lib/supabase';
import AdminPanel from './AdminPanel';
import BottomNav from '../components/BottomNav';
import { Restaurant } from '@/types/database';

async function fetchRestaurants(): Promise<Restaurant[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Supabase error:', error);
    return [];
  }
  return (data || []) as Restaurant[];
}

export default async function AdminPage() {
  const restaurants = await fetchRestaurants();

  return (
    <>
      <header className="app-header">
        <h1>管理餐厅数据</h1>
      </header>
      <div className="view" style={{ paddingTop: 16 }}>
        <AdminPanel initialRestaurants={restaurants} />
      </div>
      <BottomNav active="admin" />
    </>
  );
}
