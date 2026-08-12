import { createClient } from '@/lib/supabase';
import RestaurantDetail from './RestaurantDetail';
import { Restaurant, Dish, Review } from '@/types/database';
import { notFound } from 'next/navigation';

type Props = { params: { id: string } };

async function fetchRestaurant(id: string): Promise<{
  restaurant: Restaurant | null;
  dishes: Dish[];
  reviews: Review[];
}> {
  const supabase = createClient();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', id)
    .single();

  if (!restaurant) return { restaurant: null, dishes: [], reviews: [] };

  const [{ data: dishes }, { data: reviews }] = await Promise.all([
    supabase.from('dishes').select('*').eq('restaurant_id', id).order('is_signature', { ascending: false }),
    supabase.from('reviews').select('*').eq('restaurant_id', id).order('created_at', { ascending: false })
  ]);

  return {
    restaurant: restaurant as Restaurant,
    dishes: (dishes || []) as Dish[],
    reviews: (reviews || []) as Review[]
  };
}

export default async function RestaurantPage({ params }: Props) {
  const { restaurant, dishes, reviews } = await fetchRestaurant(params.id);

  if (!restaurant) {
    notFound();
  }

  return <RestaurantDetail restaurant={restaurant} dishes={dishes} reviews={reviews} />;
}