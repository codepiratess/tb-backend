"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("@supabase/supabase-js");
const typeorm_1 = require("typeorm");
const axios_1 = __importDefault(require("axios"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
async function checkConnections() {
    console.log('🔍 Starting TownBolt System Connection Check...\n');
    let allPass = true;
    console.log('1. Checking Database Connection (TypeORM)...');
    const dataSource = new typeorm_1.DataSource({
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
    }
    catch (err) {
        console.log(`❌ Database: Failed - ${err.message}`);
        allPass = false;
    }
    console.log('\n2. Checking Supabase Storage Connection...');
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
        const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
        try {
            const { data, error } = await supabase.storage.listBuckets();
            if (error)
                throw error;
            const bucket = data.find(b => b.name === (process.env.SUPABASE_STORAGE_BUCKET || 'townbolt-media'));
            if (bucket) {
                console.log(`✅ Supabase Storage: Connected (Bucket "${bucket.name}" exists)`);
            }
            else {
                console.log('❌ Supabase Storage: Bucket not found. Run setup:storage.');
                allPass = false;
            }
        }
        catch (err) {
            console.log(`❌ Supabase Storage: Failed - ${err.message}`);
            allPass = false;
        }
    }
    else {
        console.log('⚠️  Supabase Storage: Credentials missing in .env');
        allPass = false;
    }
    console.log('\n3. Checking Razorpay API...');
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
        try {
            const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
            await axios_1.default.get('https://api.razorpay.com/v1/orders?count=1', {
                headers: { Authorization: `Basic ${auth}` },
            });
            console.log('✅ Razorpay: API Key & Secret are valid');
        }
        catch (err) {
            if (err.response?.status === 401) {
                console.log('❌ Razorpay: Invalid API Credentials');
            }
            else {
                console.log(`❌ Razorpay: Failed - ${err.message}`);
            }
            allPass = false;
        }
    }
    else {
        console.log('⚠️  Razorpay: Credentials missing in .env');
        allPass = false;
    }
    console.log('\n4. Checking Fast2SMS Configuration...');
    if (process.env.FAST2SMS_API_KEY) {
        console.log('✅ Fast2SMS: API Key present');
    }
    else {
        console.log('⚠️  Fast2SMS: API Key missing (OTP will fail)');
    }
    console.log('\n' + '='.repeat(40));
    if (allPass) {
        console.log('\n🎉 ALL CORE SYSTEMS ARE CONNECTED! You are ready for takeoff.');
    }
    else {
        console.log('\n🔴 SOME CONNECTIONS FAILED. Please check your .env file.');
    }
    console.log('='.repeat(40) + '\n');
}
checkConnections().catch(err => {
    console.error('Fatal check error:', err);
    process.exit(1);
});
//# sourceMappingURL=check-connection.js.map