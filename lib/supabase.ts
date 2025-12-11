import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY!;

// Server-side Supabase client with service key for admin operations
export const supabase = createClient(supabaseUrl, supabaseServiceKey);

