# Lean Canvas: EcoSort AI

**Project Name:** EcoSort AI: AI-Powered Waste Classification and Recycling Assistant  
**Academic Program:** IBM SkillsBuild Masterclass 5  
**Domain:** Artificial Intelligence & Sustainable Environmental Technology  
**Alignment:** United Nations Sustainable Development Goal 12 (Target 12.5 & 12.8)  
**Document Version:** 1.0 (Academic Baseline)  

---

```
+---------------------------------------------------------------------------------------------------------------------------------------+
| 1. PROBLEM                        | 4. SOLUTION                       | 3. UNIQUE VALUE PROP.             | 9. UNFAIR ADVANTAGE               | 2. CUSTOMER SEGMENTS              |
|                                   |                                   |                                   |                                   |                                   |
| • Over 2.1B tons of municipal     | • Single-query text classifier    | "Instant, transparent waste       | • Zero-friction access: No login, | • Urban households and apartment  |
|   solid waste generated yearly.   |   categorizing items into 8       |   classification that turns       |   no app store download, no       |   dwellers confused by sorting.   |
| • High recycling contamination    |   standard streams.               |   household confusion into        |   tracking or personal data.      | • College students and campus     |
|   due to "wishcycling" (throwing  | • Plain-language disposal steps   |   responsible action, bridging    | • Context-grounded guidance:      |   communities seeking green habits.|
|   greasy boxes, batteries, etc.). |   with bin color guides.          |   consumer intent with actual     |   Distinguishes true recyclables  | • Civic eco-clubs and community   |
| • Confusion over plastic resin    | • Safety flags for hazardous      |   municipal recovery."            |   from composite wishcycling.     |   waste volunteers.               |
|   codes (1-7) & composite items. |   household wastes (batteries).   |                                   | • Dual-engine resiliency: Live    |                                   |
| • Lack of localized, instant,     | • Local private history & stats   | HIGH-LEVEL CONCEPT:               |   Gemini AI backed by verified    | EARLY ADOPTERS:                   |
|   accessible educational guidance.|   with zero personal tracking.    | "The Shazam for household waste   |   offline reference dataset.      | Environmentally conscious youth,  |
|                                   |                                   |  segregation and recycling."      |                                   | university eco-club members.      |
| EXISTING ALTERNATIVES:            +-----------------------------------+                                   +-----------------------------------+                                   |
| • Generic search engine results.  | 8. KEY METRICS                    |                                   | 5. CHANNELS                       |                                   |
| • Clunky municipal PDF brochures. |                                   |                                   |                                   |                                   |
| • Proprietary smart bin hardware  | • Classification query accuracy.  |                                   | • Institutional & campus portals. |                                   |
|   costing thousands of dollars.   | • Active session retention.       |                                   | • Open-access GitHub repository.  |                                   |
|                                   | • Repeat visits to local history. |                                   | • Web browser bookmarking.        |                                   |
|                                   | • Mean latency per classification.|                                   | • Local sustainability workshops. |                                   |
+-----------------------------------+-----------------------------------+-----------------------------------+-----------------------------------+-----------------------------------+
| 7. COST STRUCTURE                                                     | 6. REVENUE STREAMS (Sustainability Model)                             |
|                                                                       |                                                                       |
| • Google Gemini API usage (Free Tier allows 15 RPM; paid ~$0.075/1M). | • Academic Grant & Educational Open Source (Primary).                 |
| • Render / Cloud hosting: Free / Starter tier ($0 - $7/month).        | • Future Municipal / Campus White-label API Licensing (Secondary).    |
| • Domain and SSL Certificate: ~$12/year.                              | • Corporate Social Responsibility (CSR) Green Innovation Sponsorships.|
| • Zero database licensing or user storage costs (uses localStorage).  | • Non-profit educational micro-donations.                             |
+---------------------------------------------------------------------------------------------------------------------------------------+
```

---

## Detailed Block Descriptions

### 1. Problem
* **Massive Municipal Solid Waste Volume:** Global municipal solid waste generation reaches ~2.24 billion tonnes annually, expected to grow to 3.88 billion tonnes by 2050 (World Bank What a Waste 2.0).
* **The "Wishcycling" Dilemma:** Well-intentioned citizens toss non-recyclable materials (e.g., greasy pizza boxes, broken drinking glasses, laminated foil snack bags) into recycling bins, causing cross-contamination that sends entire truckloads of paper and plastic to landfills.
* **Severe Hazardous Handling Hazards:** Tossing household lithium-ion batteries or chemical canisters into standard trash bins results in violent garbage truck fires, sorting facility blazes, and toxic groundwater leachate.
* **Information Overload and Ambiguity:** Municipal brochures are static, lengthy PDFs that citizens rarely read in the 3 seconds it takes to toss an item.

### 2. Customer Segments
* **Primary Segment:** Urban households, apartment dwellers, and families aiming to segregate domestic garbage correctly at the source.
* **Secondary Segment:** University students, campus eco-clubs, and school sustainability coordinators looking for interactive educational tools.
* **Early Adopters:** Eco-conscious individuals who already attempt waste separation but frequently encounter ambiguous items (e.g., composite packaging, blister packs, coffee cups).

### 3. Unique Value Proposition
* **Instant, Transparent Waste Guidance:** Type any item name into a clean web interface to receive immediate classification across 8 standardized categories with recommended bin colors.
* **Educational & Practical:** Delivers not just a category, but the *why* (material science), the *how* (rinsing, flattening), the *reuse idea*, and *safety warnings*.
* **SDG 12 Alignment:** Directly contributes to UN Sustainable Development Goal 12.5 (waste reduction via recycling/reuse) and 12.8 (universal sustainability awareness).

### 4. Solution
* A lightweight, zero-download web application built with HTML5, CSS3, Vanilla JS, Node.js, and Express.
* Multi-modal AI classification powered by Google Gemini API (`@google/genai`) with structured JSON schema responses.
* Resilient offline reference fallback covering common household items when AI connectivity is offline.
* Client-side privacy-first dashboard providing real metrics (total items, category spread, most frequent waste type) stored strictly in `localStorage`.

### 5. Channels
* **Direct Web Access:** Deployed on Render for immediate accessibility across desktop and mobile browsers.
* **College & Academic Networks:** Demonstration in IBM SkillsBuild Masterclasses, environmental science coursework, and university tech hackathons.
* **Open Source Community:** Published on GitHub with comprehensive documentation and MIT license for educational extension.

### 6. Revenue & Sustainability Streams
* **Academic & Non-Profit Open Source:** Designed as an educational public good with zero monetized paywalls or invasive advertisements.
* **Campus & Municipal Integration:** Potential SaaS white-label licensing for smart campuses or civic urban bodies looking to reduce sorting error penalties.
* **CSR Grants:** Eligibility for sustainability-focused innovation grants from technology institutions and civic green funds.

### 7. Cost Structure
* **LLM Inference:** Free-tier Gemini API (up to 15 RPM) during academic demonstrations; scale-up cost is low at pennies per thousand queries.
* **Application Hosting:** Deployed on Render free tier (Node.js runtime + static frontend).
* **Storage & Database:** $0 incremental cost because all session history and metrics use client-side `localStorage`.
* **Maintenance & Operations:** Low overhead; modular Vanilla JS/Express codebase with no complex build steps or dependencies.

### 8. Key Metrics
* **Classification Accuracy & Relevance:** Quality of category mapping and actionable disposal advice.
* **User Engagement:** Number of items classified per session, chip interactions, and return rate.
* **Response Latency:** Sub-second classification latency for cached/offline items; under 1.8s for Gemini LLM generation.
* **History Retention:** Percentage of users reviewing past classifications and checking their local dashboard breakdown.

### 9. Unfair Advantage
* **Zero Friction & Absolute Privacy:** No signup, no email harvesting, no cookies, no tracking. Operates instantly on any device.
* **Dual-Engine Architecture:** Unlike fragile AI prototypes that crash without an API key, EcoSort AI seamlessly switches between live Gemini intelligence and a structured educational knowledge base.
* **Grounding in Realistic Municipal Reality:** Explicitly warns users that local city regulations vary and explains the difference between theoretical recyclability and actual local acceptance.
