import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fpytjscinciyvwnvzlgq.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZweXRqc2NpbmNpeXZ3bnZ6bGdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3Nzg0NTgsImV4cCI6MjA4ODM1NDQ1OH0.wB0_fCzoROYLnbM34Wxibfp3ed94qV0M70NxIaMdw1M";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
