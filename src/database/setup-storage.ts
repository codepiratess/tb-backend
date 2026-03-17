import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'townbolt-media';

if (!supabaseUrl || !supabaseKey) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupStorage() {
  console.log('Setting up Supabase Storage...');

  // 1. Create Bucket
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw listError;

  const exists = buckets.find(b => b.name === bucketName);
  if (!exists) {
    const { error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    });
    if (createError) throw createError;
    console.log(`Bucket "${bucketName}" created`);
  } else {
    console.log(`Bucket "${bucketName}" already exists`);
  }

  // 2. Set Up Policies (Note: Supabase API doesn't support complex policy creation directly via client)
  // Policies should ideally be created via SQL in a migration or Supabase Dashboard.
  // We can provide the SQL here for the user to run in Supabase SQL Editor.
  
  console.log(`
  ⚠️  Bucket Created. Please run the following RLS Policies in your Supabase SQL Editor:

  -- 1. Enable Public Read
  CREATE POLICY "Public Read Access" ON storage.objects
    FOR SELECT TO public USING (bucket_id = '${bucketName}');

  -- 2. Authenticated Upload to own folder
  CREATE POLICY "Authenticated Upload" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = '${bucketName}' 
      AND (storage.foldername(name))[1] IN ('products', 'categories', 'profiles')
    );

  -- 3. Delete access for owners
  CREATE POLICY "Delete Own Items" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = '${bucketName}' AND owner = auth.uid());
  `);

  console.log('Storage setup script finished');
}

setupStorage().catch(err => {
  console.error('Storage setup failed:', err);
  process.exit(1);
});
