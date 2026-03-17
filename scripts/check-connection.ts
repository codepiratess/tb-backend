import { createClient } from '@supabase/supabase-js';
import { DataSource } from 'typeorm';
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

async function checkConnections() {
  console.log('🔍 Starting TownBolt System Connection Check...\n');
  let allPass = true;

  // 1. Database Connection
  console.log('1. Checking Database Connection (TypeORM)...');
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database: Connected successfully');
    await dataSource.destroy();
  } catch (err: any) {
    console.log(`❌ Database: Failed - ${err.message}`);
    allPass = false;
  }

  // 2. Supabase Storage Connection
  console.log('\n2. Checking Supabase Storage Connection...');
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    try {
      const { data, error } = await supabase.storage.listBuckets();
      if (error) throw error;
      const bucket = data.find(b => b.name === (process.env.SUPABASE_STORAGE_BUCKET || 'townbolt-media'));
      if (bucket) {
        console.log(`✅ Supabase Storage: Connected (Bucket "${bucket.name}" exists)`);
      } else {
        console.log('❌ Supabase Storage: Bucket not found. Run setup:storage.');
        allPass = false;
      }
    } catch (err: any) {
      console.log(`❌ Supabase Storage: Failed - ${err.message}`);
      allPass = false;
    }
  } else {
    console.log('⚠️  Supabase Storage: Credentials missing in .env');
    allPass = false;
  }

  // 3. Razorpay Connection
  console.log('\n3. Checking Razorpay API...');
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    try {
      const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
      await axios.get('https://api.razorpay.com/v1/orders?count=1', {
        headers: { Authorization: `Basic ${auth}` },
      });
      console.log('✅ Razorpay: API Key & Secret are valid');
    } catch (err: any) {
      if (err.response?.status === 401) {
        console.log('❌ Razorpay: Invalid API Credentials');
      } else {
        console.log(`❌ Razorpay: Failed - ${err.message}`);
      }
      allPass = false;
    }
  } else {
    console.log('⚠️  Razorpay: Credentials missing in .env');
    allPass = false;
  }

  // 4. Fast2SMS (Optional check)
  console.log('\n4. Checking Fast2SMS Configuration...');
  if (process.env.FAST2SMS_API_KEY) {
    console.log('✅ Fast2SMS: API Key present');
  } else {
    console.log('⚠️  Fast2SMS: API Key missing (OTP will fail)');
  }

  console.log('\n' + '='.repeat(40));
  if (allPass) {
    console.log('\n🎉 ALL CORE SYSTEMS ARE CONNECTED! You are ready for takeoff.');
  } else {
    console.log('\n🔴 SOME CONNECTIONS FAILED. Please check your .env file.');
  }
  console.log('='.repeat(40) + '\n');
}

checkConnections().catch(err => {
  console.error('Fatal check error:', err);
  process.exit(1);
});
