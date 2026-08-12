import { createClient } from '@/lib/supabase';
import MapView from './components/MapView';
import BottomNav from './components/BottomNav';
import { Restaurant } from '@/types/database';

async function fetchRestaurants(): Promise<Restaurant[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Supabase error:', error);
    return [];
  }
  return (data || []) as Restaurant[];
}

export default async function HomePage() {
  const restaurants = await fetchRestaurants();

  return (
    <>
      <header className="app-header">
        <h1>长春清真餐厅 · 吉大周边</h1>
      </header>
      <div className="view">
        <MapView restaurants={restaurants} />
      </div>
      <BottomNav active="map" />
    </>
  );
}