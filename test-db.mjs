import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase.from('design_cards').select('price_inr, remarks').limit(1);
  console.log("design_cards check:");
  console.log("Error:", error);
  console.log("Data:", data);
}

check();
