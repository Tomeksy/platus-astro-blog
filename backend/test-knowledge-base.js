#!/usr/bin/env node

/**
 * Test script to verify knowledge_base table connection
 * Run with: node test-knowledge-base.js
 */

import dotenv from 'dotenv';
import SupabaseService from './src/services/supabase.js';

dotenv.config();

console.log('🧪 Testing Knowledge Base Connection\n');
console.log('=' .repeat(60));

async function testKnowledgeBase() {
  try {
    // Test 1: Basic connection
    console.log('\n📝 TEST 1: Supabase Connection');
    console.log('-'.repeat(40));
    
    // Check if client is initialized
    if (!SupabaseService.client) {
      console.error('❌ Supabase client not initialized');
      console.log('  Please check your .env file for:');
      console.log('  - SUPABASE_URL');
      console.log('  - SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY');
      return;
    }
    console.log('✅ Supabase client initialized');
    
    // Test 2: Direct table query
    console.log('\n📝 TEST 2: Direct Table Query');
    console.log('-'.repeat(40));
    
    try {
      const { data: countData, error: countError } = await SupabaseService.client
        .from('knowledge_base')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        console.error('❌ Cannot access knowledge_base table:', countError.message);
        console.log('\n⚠️  Please ensure:');
        console.log('  1. The table "knowledge_base" exists in your Supabase database');
        console.log('  2. RLS policies allow read access');
        console.log('  3. The table has data');
      } else {
        console.log(`✅ Knowledge base table accessible with ${countData} records`);
      }
    } catch (error) {
      console.error('❌ Table query failed:', error.message);
    }
    
    // Test 3: Sample content check
    console.log('\n📝 TEST 3: Sample Content');
    console.log('-'.repeat(40));
    
    try {
      const { data: sampleData, error: sampleError } = await SupabaseService.client
        .from('knowledge_base')
        .select('id, content, metadata')
        .limit(3);
      
      if (sampleError) {
        console.error('❌ Cannot read sample data:', sampleError.message);
      } else if (sampleData && sampleData.length > 0) {
        console.log(`✅ Found ${sampleData.length} sample records:`);
        sampleData.forEach((record, idx) => {
          console.log(`\n  Record ${idx + 1}:`);
          console.log(`    ID: ${record.id}`);
          console.log(`    Content: ${record.content?.substring(0, 100)}...`);
          console.log(`    Metadata: ${JSON.stringify(record.metadata)?.substring(0, 100)}`);
        });
      } else {
        console.log('⚠️  No data found in knowledge_base table');
        console.log('  Please add content to the knowledge_base table');
      }
    } catch (error) {
      console.error('❌ Sample query failed:', error.message);
    }
    
    // Test 4: Embedding check
    console.log('\n📝 TEST 4: Embedding Verification');
    console.log('-'.repeat(40));
    
    try {
      const { data: embData, error: embError } = await SupabaseService.client
        .from('knowledge_base')
        .select('id')
        .not('embedding', 'is', null)
        .limit(1);
      
      if (embError) {
        console.error('❌ Cannot check embeddings:', embError.message);
      } else if (embData && embData.length > 0) {
        console.log('✅ Embeddings are present in the table');
      } else {
        console.log('⚠️  No embeddings found in knowledge_base table');
        console.log('  Embeddings are required for semantic search');
        console.log('  Please generate embeddings for your content');
      }
    } catch (error) {
      console.error('❌ Embedding check failed:', error.message);
    }
    
    // Test 5: Semantic search (if embeddings exist)
    console.log('\n📝 TEST 5: Semantic Search');
    console.log('-'.repeat(40));
    
    try {
      const testQuery = 'Grid Pad Serie Kommunikationshilfe';
      console.log(`  Testing search for: "${testQuery}"`);
      
      const results = await SupabaseService.semanticSearch(testQuery, {
        limit: 5,
        threshold: 0.4  // Match speaKI's threshold
      });
      
      if (results && results.length > 0) {
        console.log(`✅ Semantic search returned ${results.length} results`);
        console.log(`  Top match similarity: ${results[0].similarity}`);
        console.log(`  Top match content: ${results[0].content?.substring(0, 100)}...`);
      } else {
        console.log('⚠️  No results from semantic search');
        console.log('  This could mean:');
        console.log('  1. No embeddings in the database');
        console.log('  2. RPC function "match_documents" not working');
        console.log('  3. No content matches the query');
        console.log('  4. Similarity threshold too high (currently 0.4, same as speaKI)');
      }
    } catch (error) {
      console.error('❌ Semantic search failed:', error.message);
      console.log('\n⚠️  The RPC function "match_documents" might be misconfigured');
      console.log('  This function should already exist (used by speaKI)');
    }
    
    // Summary
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    
    console.log('\n✅ What to do next:');
    console.log('  1. If RPC function error: Check that match_documents exists (speaKI uses it)');
    console.log('  2. If no embeddings: Generate embeddings using text-embedding-3-small');
    console.log('  3. If no data: Add content to knowledge_base table');
    console.log('  4. If all tests pass: Try generating an article with npm run generate');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  }
  
  process.exit(0);
}

testKnowledgeBase();
