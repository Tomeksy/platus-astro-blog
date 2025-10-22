# Implementation Roadmap & To-Do List

## Current System Analysis
**Last Updated:** September 27, 2025

**What's Working:**
- ✅ Backend server running on Fastify with health endpoints
- ✅ Content generation pipeline operational (generates 800+ word articles)
- ✅ OpenAI integration functional with gpt-5-mini-2025-08-07
- ✅ Airtable draft creation working
- ✅ Supabase vector search WITH speaKI's shared knowledge base (147 records)
- ✅ Duplicate detection system in place
- ✅ All 17 Platus-specific prompts implemented
- ✅ Du-form addressing throughout
- ✅ Knowledge retrieval from same database as speaKI
- ✅ Category mapping (PRODUKTINFO → products, etc.)

**What Needs Work:**
- ❌ Primary keyword generation BROKEN (empty array output)
- ❌ Workflow order inefficient (queries before keyword generation)
- ❌ No mid-generation knowledge retrieval capability
- ⚠️ B1 compliance partial - sentences too choppy (5-7 word fragments)
- ⚠️ Generic topic titles (repetitive "Alles was Sie wissen müssen")
- ❌ GitHub integration (token issues)
- ❌ No internal article linking system yet

---

## Recent Achievements (September 27, 2025)

### Successfully Completed:
1. **Knowledge Base Integration**
   - Connected to speaKI's Supabase database
   - Using same `match_documents` RPC function
   - 147 knowledge records accessible
   - Proper embedding model (text-embedding-3-small)

2. **Prompt Optimization**
   - All 17 prompts converted to Platus voice
   - Du-form implemented throughout
   - Company context integrated
   - speaKI mentions where appropriate

3. **Bug Fixes**
   - Fixed table name mismatch (documents → knowledge_base)
   - Fixed category mapping for speaKI's format
   - Lowered relevance threshold to 0.4
   - Fixed const/let variable error in retry logic

### Critical Issues Discovered:
1. **Primary Keywords:** Generation logic flawed - uses title words instead of topic analysis
2. **Workflow Order:** Keywords should be generated BEFORE knowledge query
3. **Sentence Structure:** German B1 requires 10-15 word sentences, not 5-word fragments
4. **Mid-Generation Retrieval:** Not implemented - cannot request additional knowledge during writing

---

## Manual Configuration Tasks (Human Required)

### **MUST DO BEFORE PHASE 1:**
1. **Airtable Field Changes**
   - [x] Verify "Target Audience" field has options: `Betroffener`, `Angehöriger`, `Fachpersonal`

2. **GitHub Token Update**
   - [ ] Generate new personal access token with repo permissions
   - [ ] Update GITHUB_TOKEN in .env file
   - [ ] Verify token has write access to the blog repository

3. **Company Context Preparation**
   - [x] Provide Platus company description (2-3 sentences)
   - [x] List main services offered
   - [x] Define company philosophy/mission
   - [x] Provide contact information for CTAs

## **Company Context for Content Generation**

### **Platus Company Description (2-3 sentences)**
"Platus ist Österreichs führender Experte für Assistierende Technologien mit über 21 Jahren Erfahrung in der Unterstützung von Menschen mit Beeinträchtigungen. Als Spezialisten für augmentative und alternative Kommunikation (AAC) und Augensteuerungstechnologie bietet Platus umfassende, maßgeschneiderte Lösungen für Menschen mit Kommunikationsbeeinträchtigungen. Das Unternehmen betreibt Hilfsmittelberater.online als digitalen Service mit dem KI-Berater speaKI für 24/7 Unterstützung und Beratung."

### **Main Services Offered**
- **Kommunikationshilfen** (Sprachcomputer, Tablets mit UK-Software und vieles mehr, alles zu finden in der Wissensdatenbank auf Supabase table "knowledge_base")
- **Augensteuerungssysteme** (Grid Pad Serie und vieles mehr, alles zu finden in der Wissensdatenbank auf Supabase table "knowledge_base")
- **Umfeldsteuerung** (HouseMate für Raumkontrolle und vieles mehr, alles zu finden in der Wissensdatenbank auf Supabase table "knowledge_base")
- **Individuelle Beratung** (persönlich und digital via speaKI)
- **Finanzierungsberatung** (Unterstützung bei Kostenübernahme durch Krankenkassen)
- **Schulungen und Kurse** (UK-Webkurse, Anwenderschulungen, Klinik Schulungen)
- **Lebenslange Betreuung** (Support, Updates, Anpassungen)
- **Hilfsmittel-Erprobung** (Testphasen vor Versorgung)

### **Company Philosophy/Mission**
**Mission Statement:** "Das Hilfsmittel muss passen! – mit individueller Unterstützung und moderner Technologie."

**Core Beliefs:**
- "Kommunikation ist ein grundlegendes Menschenrecht"
- "Jeder Mensch ist einzigartig und benötigt individuelle Lösungen"
- "Selbstbestimmung und Teilhabe sind wichtige Stützpfeiler"

**Value Proposition:** "Wir finden die bestmöglichen Lösungen, damit jeder Mensch seine Gedanken, Wünsche und Bedürfnisse ausdrücken kann."

### **Contact Information for CTAs**

**Primary CTA:** "Jetzt mit speaKI sprechen" (24/7 KI-Beratung)

**Secondary CTAs:**
- "Kostenlose Beratung vereinbaren"
- "Hilfsmittel testen"
- "Finanzierung prüfen"
- "Expertenteam kontaktieren"

**Contact information for CTAs**
- https://speaki.io/

### **Target Audiences for Content**
- Menschen mit ALS, MS, SMA, Zerebralparese
- Autismus-Spektrum-Störungen
- Aphasie-Patienten
- Angehörige und Betreuer
- Therapeuten und Fachkräfte
- Eltern von Kindern mit Beeinträchtigungen

---

## URGENT FIXES REQUIRED (Before Production)
**These issues must be resolved before the system is production-ready**

### Issue 1: Primary Keyword Generation BROKEN
**Current Problem:** 
- Primary keywords array is empty in all generated articles
- Logic extracts from title AFTER generation instead of topic BEFORE query
- Uses words > 4 chars from title like "serie", "alles" - not meaningful

**Solution Required:**
- **AI Task:** Rewrite `generatePrimaryKeywords()` to analyze topic string
- **AI Task:** Generate keywords BEFORE knowledge query
- **Human Task:** Provide examples of good primary keywords for topics

### Issue 2: Workflow Order Inefficient  
**Current Flow (Wrong):**
```
Topic → Query Knowledge → Generate Keywords → Write
```

**Should Be:**
```
Topic → Generate Keywords → Query Knowledge WITH Keywords → Write
```

**Impact:** 60-70% reduction in vector search costs possible

**Solution Required:**
- **AI Task:** Restructure workflow in `generateBlogArticle()`
- **AI Task:** Use keywords to guide knowledge retrieval
- **Human Task:** Approve new workflow sequence

### Issue 3: Sentence Structure Too Choppy
**Current Output Example:**
"Das Grid Pad ist toll. Es hilft Menschen. Die Bedienung ist einfach. Jeder kann es nutzen."

**Should Be:**
"Das Grid Pad ist ein tolles Hilfsmittel, das Menschen mit Einschränkungen dabei hilft selbstständig zu kommunizieren."

**Solution Required:**
- **Human Task:** Provide 5-10 examples of good B1 German sentences
- **AI Task:** Adjust prompts to encourage 10-15 word sentences
- **AI Task:** Add sentence variety patterns to prompts

### Issue 4: No Mid-Generation Knowledge Retrieval
**Current:** All knowledge must be gathered upfront
**Needed:** AI should request specific details during writing

**Solution Required:**
- **AI Task:** Implement callback mechanism for knowledge requests
- **AI Task:** Add "knowledge gap detection" during generation
- **Human Task:** Define which types of information can be requested

---

## Phase 1: Prompt System Overhaul & Intent Expansion
**Objective:** Transform generic AI prompts into Platus-specific content generation with proper intent categories
**Dependencies:** Airtable field configuration must be complete

### Tasks:

- [ ] **Update Intent Category Mapping** - Map 4 new intent types in content generation
  - **Implementation:** Modify `openai.js` buildSystemPrompt() to handle 4 intent categories
  - **Human Input:** None after Airtable configuration
  - **Testing:** Generate test article for each intent type
  - **Notes:** Must match Airtable single-select options exactly

- [ ] **Implement B1 Reading Level Compliance** - Add readability checks and instructions
  - **Implementation:** Add B1 guidelines to system prompts, create readability validator
  - **Human Input:** None
  - **Testing:** Check generated content with online B1 readability tools
  - **Notes:** Consider using Flesch Reading Ease adapted for German

- [ ] **Switch to Du-Form Addressing** - Change from formal Sie to informal Du
  - **Implementation:** Update all prompt templates in `openai.js`
  - **Human Input:** Confirm this is desired for all content types
  - **Testing:** Review generated articles for consistent Du usage
  - **Notes:** Important for accessibility and connection with readers

- [ ] **Add Platus Business Context** - Integrate company information without static prompts
  - **Implementation:** Create dynamic context injection based on article topic
  - **Human Input:** Provide company details (see manual tasks)
  - **Testing:** Verify company context appears naturally in articles
  - **Notes:** Avoid repetitive boilerplate, keep context relevant

---

## Phase 2: Knowledge Retrieval Enhancement
**Objective:** Move from static retrieval to dynamic, iterative knowledge queries
**Dependencies:** Phase 1 completion for proper context understanding

### Tasks:

- [ ] **Dynamic Chunk Quantity** - Adjust retrieval based on topic complexity
  - **Implementation:** Modify queryKnowledge() to determine chunk count dynamically
  - **Human Input:** None
  - **Testing:** Compare article quality with different chunk quantities
  - **Notes:** Already partially implemented, needs activation

- [ ] **Iterative Query Refinement** - Enable multi-stage knowledge gathering
  - **Implementation:** Enhance synthesizeKnowledge() for follow-up queries
  - **Human Input:** None
  - **Testing:** Monitor knowledge retrieval logs for effectiveness
  - **Notes:** Code structure exists, needs connection to generation flow

- [ ] **Quality-Based Retrieval** - Stop when sufficient high-quality results found
  - **Implementation:** Already implemented in queryKnowledge(), needs threshold tuning
  - **Human Input:** None
  - **Testing:** Analyze similarity scores vs content relevance
  - **Notes:** Current threshold at 0.8 for high quality

---

## Phase 3: Internal Linking System
**Objective:** Automatically link to existing published articles for SEO and engagement
**Dependencies:** Posted Articles table must exist in Airtable

### Tasks:

- [ ] **Fetch Posted Articles** - Retrieve URLs from posted articles table
  - **Implementation:** Add getPostedArticles() method to airtable.js
  - **Human Input:** Ensure Posted Articles table has URL field
  - **Testing:** Verify successful retrieval of published article data
  - **Notes:** Consider caching for performance

- [ ] **Semantic Matching** - Find relevant articles to link
  - **Implementation:** Create findRelatedArticles() using title/keyword matching
  - **Human Input:** None
  - **Testing:** Review suggested links for relevance
  - **Notes:** Use existing calculateTitleOverlap() logic

- [ ] **Link Injection** - Add contextual internal links to generated content
  - **Implementation:** Post-process content to insert markdown links
  - **Human Input:** Define maximum links per article (suggest 2-3)
  - **Testing:** Verify links are contextually appropriate
  - **Notes:** Avoid over-linking, maintain natural flow

---

## Phase 4: Quality Assurance & Optimization
**Objective:** Ensure consistent high-quality output
**Dependencies:** Phases 1-3 complete

### Tasks:

- [ ] **Readability Scoring** - Implement German B1 readability metrics
  - **Implementation:** Create readability analyzer for German text
  - **Human Input:** None
  - **Testing:** Validate against known B1 compliant texts
  - **Notes:** May need external library for German language analysis

- [ ] **Keyword Density Optimization** - Ensure proper SEO without keyword stuffing
  - **Implementation:** Enhance checkContentQuality() with density limits
  - **Human Input:** Define ideal keyword density (suggest 1-2%)
  - **Testing:** Analyze top-performing articles for baseline
  - **Notes:** Already tracks keyword integration

- [ ] **Content Structure Validation** - Ensure consistent article structure
  - **Implementation:** Strengthen structure checks in assessContentQuality()
  - **Human Input:** Define required sections (intro, main, conclusion)
  - **Testing:** Review generated articles for completeness
  - **Notes:** Currently checks heading count, needs section validation

- [ ] **Performance Monitoring** - Track generation metrics
  - **Implementation:** Add detailed logging and metrics collection
  - **Human Input:** Define KPIs to track
  - **Testing:** Review logs for bottlenecks
  - **Notes:** Timing infrastructure already in place

---

## Phase 5: Production Deployment Preparation
**Objective:** Ensure system is production-ready
**Dependencies:** All previous phases complete, GitHub token working

### Tasks:

- [ ] **Error Recovery** - Implement robust error handling
  - **Implementation:** Add retry logic for all external service calls
  - **Human Input:** None
  - **Testing:** Simulate service failures
  - **Notes:** Partial retry logic exists, needs completion

- [ ] **Rate Limiting** - Prevent API quota exhaustion
  - **Implementation:** Add rate limiters for OpenAI and Airtable
  - **Human Input:** Define rate limits based on API quotas
  - **Testing:** Stress test with multiple concurrent requests
  - **Notes:** Critical for cost control

- [ ] **Monitoring & Alerts** - Set up production monitoring
  - **Implementation:** Add health check endpoints for all services
  - **Human Input:** Define alert thresholds
  - **Testing:** Verify alerts trigger correctly
  - **Notes:** Basic health checks exist, need expansion

- [ ] **Documentation** - Complete API and operational documentation
  - **Implementation:** Document all endpoints and workflows
  - **Human Input:** Review and approve documentation
  - **Testing:** Have someone unfamiliar test using only docs
  - **Notes:** Essential for maintenance and handover

---

## Quick Wins (Can Do Immediately)

1. ~~**Fix Intent Mapping**~~ - ✅ Done (4 categories implemented)
2. ~~**Add Du-Form**~~ - ✅ Done (all prompts use Du)
3. ~~**Improve Logging**~~ - ✅ Done (comprehensive Winston logging added)
4. ~~**Test Duplicate Detection**~~ - ✅ Working (verified in production)

---

## Risk Mitigation

### High Priority Risks:
1. **Airtable API Changes** - Keep field names synchronized
2. **OpenAI Rate Limits** - Monitor token usage closely
3. **Supabase Query Costs** - Optimize embedding calls
4. **Content Quality Drift** - Regular quality audits needed

### Backup Plans:
1. **Fallback Knowledge** - Already implemented for vector DB failures
2. **Manual Override** - Keep ability to edit before publishing
3. **Rollback Strategy** - Version control for all configurations

---

## Success Metrics

- **Content Quality Score**: > 0.8 for all articles
- **Generation Success Rate**: > 95%
- **Average Generation Time**: < 45 seconds
- **B1 Readability Compliance**: 100%
- **Duplicate Detection Accuracy**: > 90%
- **Internal Links per Article**: 2-3 relevant links

---

## Next Immediate Actions

1. **Human Decision Required**: Approve workflow reordering (keywords first)
2. **Human Input Needed**: Provide examples of good B1 German writing style
3. **AI Task**: Fix primary keyword generation from topic analysis
4. **AI Task**: Restructure workflow to be more efficient
5. **Testing**: Generate test articles with new workflow
6. **Human Review**: Evaluate sentence structure improvements

---

*Last Updated: 27. September 2025*
*Document Status: Active Development*
*Owner: Tom Symantzyk*
