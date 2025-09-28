# Current Blog Generation Workflow Sequence

**Document Created:** September 27, 2025  
**Purpose:** Clear explanation of how blog articles are currently generated  
**Status:** Working but needs optimization

---

## 📊 High-Level Flow

```
User Input → Knowledge Query → Topic Generation → Metadata Assignment → Content Generation → Quality Check → Airtable
```

---

## 🔄 Detailed Workflow Sequence

### Step 1: User Input
**Input:** Topic string + Intent  
**Example:** `{ "topic": "Grid Pad Serie", "intent": "educational" }`

---

### Step 2: Knowledge Discovery (BEFORE Keywords!)
**What happens:** The system immediately queries the knowledge base using the raw topic
```
Query 1: "Grid Pad Serie" (broad search)
Query 2: "Grid Pad Serie Grundlagen Einführung" (intent-specific)
Query 3: "Grid Pad Serie erklärt für Anfänger" (alternative angle)
```

**Current Issue:** We're querying BEFORE determining keywords - this is backwards!

---

### Step 3: Knowledge Synthesis
**What happens:** Groups results into categories
- Products (mapped from speaKI's "PRODUKTINFO")
- Services (mapped from "BERATUNG")
- FAQs (rarely populated)
- Guides (default category)

**Result:** Knowledge object with ~0.5 relevance score

---

### Step 4: Topic Generation
**What happens:** Creates 3 topic variations based on knowledge
```
1. "Grid Pad Serie: Alles was Sie wissen müssen" (0.501 relevance)
2. "Grid Pad Serie: Alles was Sie wissen müssen für Einsteiger" (0.451)
3. "Grid Pad Serie: Alles was Sie wissen müssen für Fortgeschrittene" (0.400)
```

**Issue:** Generic, repetitive topics - not leveraging knowledge effectively

---

### Step 5: Topic Selection & Metadata
**What happens:** 
1. Checks topics against minimum relevance (0.4)
2. Checks for duplicates in Airtable
3. Assigns category based on title words
4. **GENERATES PRIMARY KEYWORDS HERE** (but failing!)

**Code Location:** `determineTopicMetadata()` in contentGenerator.js

**Primary Keyword Generation Logic:**
```javascript
generatePrimaryKeywords(topic, category) {
  const keywords = [];
  // Extract main terms from title
  const titleWords = topic.title.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 4); // Only words > 4 chars
  
  keywords.push(...titleWords.slice(0, 2)); // Takes first 2 long words
  // ... adds category keywords
  return [...new Set(keywords)].slice(0, 3); // Max 3 primary keywords
}
```

**Problem:** Title "Grid Pad Serie: Alles was Sie wissen müssen" 
- Filters to words > 4 chars: ["serie", "alles", "wissen", "müssen"]
- Takes first 2: ["serie", "alles"]
- Not meaningful keywords!

---

### Step 6: Content Generation
**What happens:**
1. Calls OpenAI with topic + knowledge context
2. Uses optimized prompts (Du-form, B1 level)
3. Generates 800-1200 words

**Current Issues:**
- Choppy sentences (5-7 word fragments)
- Not truly B1 compliant
- Knowledge context might be too generic

---

### Step 7: Quality Assessment
**Checks:**
- Word count (✓ Working)
- Structure/headings (✓ Working)
- Keyword integration (✗ Failing - no primary keywords to check!)
- Overall score: 0.8 (but misleading)

---

### Step 8: Airtable Storage
**What happens:** Saves to Drafts table with all metadata

---

## ❌ What's NOT Working

### 1. Mid-Generation Knowledge Retrieval
**Status:** NOT IMPLEMENTED
- No mechanism for the AI to request additional knowledge during writing
- All knowledge must be gathered upfront
- Cannot ask for specific product details mid-article

### 2. Primary Keywords
**Status:** BROKEN
- Generation logic is flawed (using title words instead of knowledge)
- Should extract from knowledge base content
- Should happen BEFORE knowledge query to guide retrieval

### 3. Workflow Order
**Current (Wrong):**
```
Topic → Query Knowledge → Generate Keywords → Write
```

**Should Be:**
```
Topic → Analyze Intent → Generate Keywords → Query Knowledge WITH Keywords → Write
```

---

## 🎯 The Correct Workflow Should Be:

### Phase 1: Topic Analysis
1. Receive user topic
2. Analyze intent 
3. **Generate primary keywords from topic** (e.g., "Grid Pad", "Kommunikationshilfe", "Tablet")
4. Generate secondary keywords

### Phase 2: Targeted Knowledge Retrieval
1. Query knowledge base using primary keywords
2. Retrieve most relevant chunks
3. Identify gaps that need filling

### Phase 3: Content Generation
1. Create article with retrieved knowledge
2. **Request additional knowledge mid-generation if needed** (not implemented)
3. Ensure keywords are naturally integrated

### Phase 4: Quality & Publishing
1. Assess quality with proper metrics
2. Save to Airtable
3. Eventually publish to GitHub

---

## 📈 Cost Implications

**Current Approach (Inefficient):**
- 3 broad queries × 15-25 results = 45-75 embedding comparisons
- Generic knowledge retrieval
- May need multiple generation attempts

**Optimized Approach:**
- 1-2 targeted queries with keywords = 10-20 embedding comparisons
- Specific, relevant knowledge
- Higher first-attempt success rate

**Potential Savings:** 60-70% reduction in vector search operations

---

## 🔧 Implementation Priority

1. **Fix Primary Keyword Generation** (Critical)
   - Extract from topic analysis, not title
   - Use NLP or pattern matching
   - Must happen BEFORE knowledge query

2. **Reorder Workflow** (High)
   - Keywords first, then knowledge
   - More targeted retrieval

3. **Implement Mid-Generation Retrieval** (Medium)
   - Allow AI to request specific information
   - Reduce upfront knowledge gathering

4. **Fix Sentence Structure** (High)
   - Proper B1 German sentence flow
   - 10-15 word sentences, not 5-word fragments

---

## 📝 Current Capabilities Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Knowledge Retrieval | ✅ Working | But inefficient order |
| Topic Generation | ✅ Working | But generic/repetitive |
| Primary Keywords | ❌ Broken | Empty array in output |
| Secondary Keywords | ⚠️ Partial | Extracted from content |
| Mid-Gen Retrieval | ❌ Not Implemented | Cannot request additional info |
| B1 Compliance | ⚠️ Partial | Too choppy, needs refinement |
| Duplicate Detection | ✅ Working | Checks Airtable |
| Quality Scoring | ⚠️ Misleading | Says 0.8 but has issues |

---

## Next Steps

**Human Tasks:**
1. Decide on keyword generation strategy
2. Approve workflow reordering
3. Provide sample of good B1 German writing

**AI Tasks:**
1. Fix primary keyword generation logic
2. Reorder workflow (keywords → knowledge → content)
3. Implement proper German sentence structure
4. Add mid-generation knowledge retrieval (later phase)
