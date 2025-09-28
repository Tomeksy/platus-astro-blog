# How to Populate the Knowledge Base

## Current Status

The test script revealed that your `knowledge_base` table is **completely empty**:
- ✅ Table exists and is accessible
- ⚠️ 0 records in the table
- ⚠️ No embeddings present
- ⚠️ Semantic search returns no results

This is why content generation fails with "No viable topics could be generated".

## Understanding the Issue

The blog generation system works by:
1. Searching the `knowledge_base` for relevant content
2. Using that knowledge to generate articles
3. **No knowledge = No articles can be generated**

speaKI uses the same table, so if speaKI is working, then:
- Either speaKI has a different data source
- Or speaKI's knowledge_base is on a different Supabase project

## Solution: Populate the Knowledge Base

You need to add content to the `knowledge_base` table with:
- `content` (text): The actual information about products/services
- `embedding` (vector): Generated using OpenAI's `text-embedding-3-small`
- `metadata` (jsonb): Product names, categories, etc.

## Method 1: Use speaKI's Embedding Script

Since speaKI works with the same table, check if there's an existing script:

```python
# Look for something like this in speaKI's codebase:
backend/scripts/embed_knowledge.py  # Referenced in your speaKI code
```

## Method 2: Create Sample Data Script

Here's a simple Node.js script to add sample data:

```javascript
// populate-knowledge.js
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text
  });
  return response.data[0].embedding;
}

async function addKnowledge(content, metadata) {
  const embedding = await generateEmbedding(content);
  
  const { data, error } = await supabase
    .from('knowledge_base')
    .insert({
      content,
      embedding,
      metadata
    });
    
  if (error) {
    console.error('Error inserting:', error);
  } else {
    console.log('✅ Added knowledge:', metadata.product_name);
  }
}

// Add sample Grid Pad content
async function populateSampleData() {
  await addKnowledge(
    'Die Grid Pad Serie sind hochmoderne Kommunikationshilfen mit Augensteuerung. Sie ermöglichen Menschen mit motorischen Einschränkungen die vollständige Kontrolle über ihren Computer und ihre Kommunikation. Die Geräte verfügen über eine präzise Augensteuerungstechnologie und können mit verschiedenen Software-Lösungen wie Grid 3 verwendet werden.',
    {
      product_name: 'Grid Pad Serie',
      section: 'Übersicht',
      category: 'Kommunikationshilfen'
    }
  );
  
  await addKnowledge(
    'Grid Pad Geräte sind ideal für Menschen mit ALS, Zerebralparese, Rückenmarksverletzungen oder anderen Erkrankungen, die die Bewegungsfähigkeit einschränken. Die Augensteuerung ermöglicht es, nur mit den Augen zu tippen, zu sprechen und den Computer zu bedienen.',
    {
      product_name: 'Grid Pad Serie',
      section: 'Zielgruppe',
      category: 'Kommunikationshilfen'
    }
  );
  
  // Add more content as needed...
}

populateSampleData();
```

## Method 3: Direct SQL Insert (Quick Test)

For quick testing, you can add a record directly in Supabase SQL Editor:

```sql
-- First, check if you have any data
SELECT COUNT(*) FROM knowledge_base;

-- If empty, you can add test data (without embeddings - won't work for search)
INSERT INTO knowledge_base (content, metadata) 
VALUES (
  'Grid Pad Serie Test Content',
  '{"product_name": "Grid Pad", "category": "test"}'::jsonb
);
```

**Note:** Without embeddings, semantic search won't work!

## Method 4: Copy from speaKI's Database

If speaKI has data in a different project/table:
1. Export the data from speaKI's knowledge_base
2. Import it into this project's knowledge_base

## Verification

After adding data, run the test again:

```bash
cd backend
node test-knowledge-base.js
```

You should see:
- ✅ Records found in knowledge_base
- ✅ Embeddings present
- ✅ Semantic search returns results

Then try generating content:

```bash
curl -X POST http://localhost:3001/api/generate \
  -H "Content-Type: application/json" \
  -d '{"topic": "Grid Pad Serie", "intent": "educational"}'
```

## Important Notes

1. **Same embeddings model**: Use `text-embedding-3-small` (same as speaKI)
2. **Metadata structure**: Follow speaKI's format for compatibility
3. **Content quality**: The better the knowledge base content, the better the generated articles

## Next Steps

1. Check if speaKI's database has the data you need
2. Either copy that data or create new content
3. Generate embeddings for all content
4. Test with the verification steps above
