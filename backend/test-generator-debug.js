#!/usr/bin/env node

/**
 * Debug script to test ContentGenerator directly
 */

import dotenv from 'dotenv';
import ContentGenerator from './src/services/contentGenerator.js';
import SupabaseService from './src/services/supabase.js';

dotenv.config();

console.log('🔍 Testing ContentGenerator Direct Access\n');
console.log('=' .repeat(60));

async function debugGenerator() {
  try {
    // First check if Supabase is working directly
    console.log('📝 Step 1: Test Direct Supabase Access');
    console.log('-'.repeat(40));
    
    const testQuery = 'Grid Pad Serie';
    console.log(`Testing query: "${testQuery}"`);
    
    const directResults = await SupabaseService.semanticSearch(testQuery, {
      limit: 5,
      threshold: 0.4
    });
    
    console.log(`✅ Direct search returned ${directResults.length} results`);
    if (directResults.length > 0) {
      console.log(`   Top result similarity: ${directResults[0].similarity}`);
    }
    
    // Now test ContentGenerator
    console.log('\n📝 Step 2: Test ContentGenerator Instance');
    console.log('-'.repeat(40));
    
    const generator = new ContentGenerator();
    console.log('Generator created');
    console.log(`Has supabaseService: ${!!generator.supabaseService}`);
    console.log(`Has supabaseService.client: ${!!generator.supabaseService?.client}`);
    
    // Test queryVectorDB directly
    console.log('\n📝 Step 3: Test queryVectorDB Method');
    console.log('-'.repeat(40));
    
    try {
      const vectorResults = await generator.queryVectorDB(testQuery, {
        threshold: 0.4,
        limit: 5
      });
      
      console.log(`✅ queryVectorDB returned ${vectorResults.length} results`);
      if (vectorResults.length > 0) {
        console.log(`   Top result similarity: ${vectorResults[0].similarity}`);
      }
    } catch (error) {
      console.error('❌ queryVectorDB failed:', error.message);
    }
    
    // Test queryKnowledge
    console.log('\n📝 Step 4: Test queryKnowledge Method');
    console.log('-'.repeat(40));
    
    try {
      const knowledge = await generator.queryKnowledge(testQuery, 'educational');
      console.log('Knowledge synthesis results:');
      console.log(`  Total chunks: ${knowledge.totalChunks}`);
      console.log(`  Relevance score: ${knowledge.relevanceScore}`);
      console.log(`  FAQs: ${knowledge.faqs?.length || 0}`);
      console.log(`  Products: ${knowledge.products?.length || 0}`);
      console.log(`  Guides: ${knowledge.guides?.length || 0}`);
      console.log(`  Key insights: ${knowledge.keyInsights?.length || 0}`);
    } catch (error) {
      console.error('❌ queryKnowledge failed:', error.message);
      console.error('Stack:', error.stack);
    }
    
    // Test topic generation
    console.log('\n📝 Step 5: Test generateBlogArticle');
    console.log('-'.repeat(40));
    
    try {
      console.log('Attempting full article generation...');
      const article = await generator.generateBlogArticle(testQuery, { 
        intent: 'educational' 
      });
      
      console.log('✅ Article generated successfully!');
      console.log(`   Title: ${article['Main Post Title']}`);
      console.log(`   Word count: ${article.wordCount}`);
      console.log(`   Quality score: ${article.qualityScore}`);
    } catch (error) {
      console.error('❌ Article generation failed:', error.message);
      
      // Try to understand where it failed
      if (error.message.includes('No viable topics')) {
        console.log('\n⚠️  Failed at topic generation stage');
        console.log('   This means knowledge was retrieved but topics were rejected');
      } else if (error.message.includes('Insufficient knowledge')) {
        console.log('\n⚠️  Failed at knowledge retrieval stage');
        console.log('   This means the vector DB queries returned too few results');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Debug test failed:', error.message);
    console.error(error.stack);
  }
}

console.log('\nStarting debug test...\n');
debugGenerator().then(() => {
  console.log('\n' + '='.repeat(60));
  console.log('Debug test complete');
  process.exit(0);
});
