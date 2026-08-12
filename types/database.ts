export type Restaurant = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  lat: number;
  lng: number;
  category: string | null;
  avg_price: number;
  rating: number;
  description: string | null;
  cover_url: string | null;
  meituan_url: string | null;
  is_active: boolean;
  created_at: string;
};

export type Dish = {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  price: number;
  is_signature: boolean;
  sort_order: number;
};

export type Review = {
  id: string;
  restaurant_id: string;
  user_name: string;
  user_avatar: string | null;
  rating: number;
  content: string;
  photos: string[];
  created_at: string;
};