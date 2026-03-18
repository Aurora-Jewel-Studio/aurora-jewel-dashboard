import { createClient } from "@supabase/supabase-js";
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function test() {
  const { data, error } = await supabaseAdmin.storage.from("pipeline-files").upload("test.txt", "hello world");
  console.log("Upload test:", { data, error });
}
test();
