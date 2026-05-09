import { createClient } from '@supabase/supabase-js';

// انتبه: استبدل القيم أدناه ببيانات مشروعك الخاصة من Supabase
// Note: Replace the values below with your specific Supabase project data
const SUPABASE_URL = "https://alsinwheqddyhsfaeatv.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_8b_Q-9xkWx1t_2K1FkQDbw_Ud0k6JC_";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
