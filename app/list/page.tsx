import { createClient } from '@/lib/supabase';
import RestaurantList from './RestaurantList';
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

export default async function ListPage() {
  const restaurants = await fetchRestaurants();
  return <RestaurantList restaurants={restaurants} />;
}
