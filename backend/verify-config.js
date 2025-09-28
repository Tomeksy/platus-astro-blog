#!/usr/bin/env node

/**
 * Verify Supabase configuration matches speaKI
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

console.log('🔍 Verifying Supabase Configuration\n');
console.log('=' .repeat(60));

// Check environment variables
console.log('\n📋 Environment Variables:');
console.log('-'.repeat(40));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('SUPABASE_URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : '❌ NOT SET');
console.log('SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ SET' : '❌ NOT SET');
console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ SET' : '❌ NOT SET');

// Check if URL matches speaKI's
const SPEAKI_URL = 'https://xrvngrixmaxgvbwmzzwx.supabase.co';

console.log('\n📊 URL Comparison:');
console.log('-'.repeat(40));
console.log('speaKI URL:', SPEAKI_URL);
console.log('Your URL:  ', supabaseUrl || 'NOT SET');

if (supabaseUrl === SPEAKI_URL) {
  console.log('✅ URLs MATCH - Using same Supabase project as speaKI');
} else {
  console.log('❌ URLs DO NOT MATCH - Different Supabase project!');
  console.log('\n⚠️  This is likely why you get 0 results!');
  console.log('   speaKI uses a different database than your blog backend.');
  console.log('\nSOLUTION:');
  console.log('1. Update your .env to use speaKI\'s Supabase URL and keys');
  console.log('2. Or populate your own Supabase with knowledge data');
}

// Try to connect and count records
if (supabaseUrl && (supabaseAnonKey || supabaseServiceKey)) {
  console.log('\n🔌 Testing Connection:');
  console.log('-'.repeat(40));
  
  try {
    const supabase = createClient(
      supabaseUrl, 
      supabaseServiceKey || supabaseAnonKey
    );
    
    // Count records in knowledge_base
    const { count, error } = await supabase
      .from('knowledge_base')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log('❌ Error querying knowledge_base:', error.message);
    } else {
      console.log(`✅ Connected successfully`);
      console.log(`📚 Records in knowledge_base: ${count || 0}`);
      
      if (count === 0) {
        console.log('\n⚠️  Table is empty - No data to retrieve!');
      }
    }
    
    // Check if match_documents function exists
    console.log('\n🔍 Testing RPC Function:');
    console.log('-'.repeat(40));
    
    // Create a dummy embedding (1536 dimensions of 0)
    const dummyEmbedding = new Array(1536).fill(0);
    
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('match_documents', {
        query_embedding: dummyEmbedding,
        match_threshold: 0.1,
        match_count: 1
      });
    
    if (rpcError) {
      console.log('❌ RPC function error:', rpcError.message);
      if (rpcError.message.includes('does not exist')) {
        console.log('\n   The match_documents function needs to be created.');
        console.log('   See speaKI\'s SQL function definition.');
      }
    } else {
      console.log('✅ RPC function match_documents is working');
      console.log(`   Returned ${rpcData?.length || 0} results`);
    }
    
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
  }
}

console.log('\n' + '='.repeat(60));
console.log('📝 NEXT STEPS:');
console.log('='.repeat(60));

if (supabaseUrl !== SPEAKI_URL) {
  console.log('\nOption 1: Use speaKI\'s Database');
  console.log('  Update your .env file with:');
  console.log('  SUPABASE_URL=' + SPEAKI_URL);
  console.log('  SUPABASE_ANON_KEY=[Get from speaKI project]');
  console.log('  SUPABASE_SERVICE_ROLE_KEY=[Get from speaKI project]');
  
  console.log('\nOption 2: Populate Your Own Database');
  console.log('  1. Create the match_documents RPC function');
  console.log('  2. Run: node populate-sample-knowledge.js');
  console.log('  3. Or copy data from speaKI\'s database');
} else {
  console.log('\n✅ Configuration looks correct!');
  console.log('   If still getting 0 results, check:');
  console.log('   1. The knowledge_base table has data');
  console.log('   2. The embeddings are generated correctly');
  console.log('   3. The match_documents function is created');
}

process.exit(0);
