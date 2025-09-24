# Implementation Roadmap & To-Do List

## Current System Analysis

**What's Working:**
- ✅ Backend server running on Fastify with health endpoints
- ✅ Content generation pipeline operational (generates 800+ word articles)
- ✅ OpenAI integration functional with gpt-4o-mini
- ✅ Airtable draft creation working
- ✅ Supabase vector search implemented with embeddings
- ✅ Duplicate detection system in place

**What Needs Work:**
- ⚠️ Generic prompts instead of Platus-specific context
- ⚠️ Only 2 intent categories instead of 4
- ⚠️ Missing B1 reading level compliance
- ⚠️ Using formal "Sie" instead of informal "Du"
- ⚠️ No internal article linking system
- ❌ GitHub integration (token issues)

---

## Manual Configuration Tasks (Human Required)

### **MUST DO BEFORE PHASE 1:**
1. **Airtable Field Changes**
   - [ ] Change "Intent" field from "Single line text" to "Single select"
   - [ ] Add exact options: `Informational`, `Investigational`, `Navigational`, `Commercial`
   - [ ] Verify "Target Audience" field has options: `Betroffener`, `Angehöriger`, `Fachpersonal`

2. **GitHub Token Update**
   - [ ] Generate new personal access token with repo permissions
   - [ ] Update GITHUB_TOKEN in .env file
   - [ ] Verify token has write access to the blog repository

3. **Company Context Preparation**
   - [ ] Provide Platus company description (2-3 sentences)
   - [ ] List main services offered
   - [ ] Define company philosophy/mission
   - [ ] Provide contact information for CTAs

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

1. **Fix Intent Mapping** - Update the intent handling to prepare for 4 categories
2. **Add Du-Form** - Simple find/replace in prompts
3. **Improve Logging** - Enhance existing Winston logging
4. **Test Duplicate Detection** - Verify the sophisticated duplicate checking works

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

1. **Human Tasks First**: Complete Airtable field configuration
2. **Start Phase 1**: Implement intent categories and Du-form
3. **Test Current System**: Verify all working components
4. **Document Issues**: Keep track of any new problems discovered

---

*Last Updated: 24. September 2025*
*Document Status: Active Development*
*Owner: Tom Symantzyk*
