# Academic Concept Note: EcoSort AI

**Project Title:** EcoSort AI: AI-Powered Waste Classification and Recycling Assistant  
**Academic Program:** IBM SkillsBuild Masterclass 5  
**Submission Category:** Artificial Intelligence for Sustainable Development  
**UN SDG Alignment:** Goal 12 — Responsible Consumption and Production (Targets 12.5 & 12.8)  
**Author / Development Team:** EcoSort AI Project Team  
**Date:** October 2026  

---

## 1. Abstract
Rapid global urbanization and consumerism generate over 2 billion metric tonnes of municipal solid waste every year, a large portion of which ends up in landfills or open incinerators. A major bottleneck in the waste recovery lifecycle is post-consumer sorting: citizens often lack clear, actionable knowledge regarding whether an item can be recycled, composted, or disposed of safely. This leads to the phenomenon of "wishcycling"—where non-recyclable or contaminated materials enter the recycling stream, spoiling entire batches.

**EcoSort AI** is a lightweight, accessible web application designed to bridge the gap between consumer intent and responsible waste management. Users input the name of common domestic items, food scraps, packaging, or electronic goods. Leveraging the **Google Gemini API** combined with an offline-resilient reference knowledge base, the system categorizes the item into one of eight canonical waste streams, highlights recommended bin colors, explains the material's environmental impact, provides step-by-step disposal procedures, offers creative upcycling tips, and flags critical safety precautions (e.g., battery fire hazards and sharp glass risks). EcoSort AI operates without requiring user registration, preserving privacy by managing search history exclusively via browser `localStorage`. This project serves as an educational guidance tool aligned with **UN Sustainable Development Goal 12**, demonstrating how accessible artificial intelligence can promote sustainable domestic habits.

---

## 2. Problem Statement
Despite widespread civic awareness campaigns, domestic waste segregation rates remain critically low across both developed and developing regions. This failure stems from several root causes:

1. **Information Ambiguity and "Wishcycling":** Consumers frequently assume that because an item looks like plastic or paper, it is universally recyclable. Common examples include grease-saturated pizza boxes, metallized foil chip packets, and composite paper cups lined with polyethylene. When placed in blue paper or plastic bins, they ruin pulping equipment and degrade recyclate purity.
2. **Hazardous Waste in Domestic Streams:** Spent lithium-ion batteries, button cells, CFL tubes, and chemical cleaning bottles are routinely tossed into standard trash, causing compaction-triggered truck fires and heavy-metal leachate into groundwater aquifers.
3. **Inaccessible Municipal Regulations:** Civic guidelines are often published as static multi-page PDF documents or complicated regulatory codes that are cumbersome to consult in daily domestic settings.
4. **Hardware and App Friction:** Existing solutions often depend on specialized sensor-equipped smart bins costing thousands of dollars or heavy mobile apps requiring user registration and device permissions.

---

## 3. Project Objectives
The primary objectives of EcoSort AI are:
1. **Develop an Instant Classification Assistant:** Enable users to query any domestic waste item via a lightweight web interface and obtain instant disposal advice.
2. **Standardize Waste Streams:** Categorize items into eight recognized waste streams:
   - Wet or Organic Waste
   - Recyclable Paper and Cardboard
   - Plastic Waste
   - Glass Waste
   - Metal Waste
   - Electronic Waste (E-Waste)
   - General or Non-Recyclable Waste
   - Hazardous or Special-Handling Waste
3. **Deliver Holistic Guidance:** Provide not just a categorical label, but actionable preparation steps (e.g., rinse, detach caps, flatten), upcycling suggestions, and safety flags.
4. **Promote UN SDG 12:** Cultivate mindful consumption and source segregation habits in line with Target 12.5 (waste reduction) and Target 12.8 (sustainable lifestyles).
5. **Ensure Privacy and Resilience:** Guarantee zero user tracking by utilizing local storage for session history and implementing dual-engine fallback when cloud AI services are unreachable.

---

## 4. Target Users
* **Urban Households & Families:** Individuals managing domestic kitchens, online shopping packaging, and daily domestic refuse.
* **College Students & Educational Campuses:** Students living in dormitories and campus eco-clubs seeking practical guidance for shared recycling spaces.
* **Civic Waste Volunteers & Educators:** Environmental advocates conducting awareness workshops on waste segregation and circular economy principles.
* **Small Offices & Co-working Spaces:** Shared workplaces looking to reduce contamination fines in commercial waste bins.

---

## 5. Proposed AI Solution
EcoSort AI addresses this challenge using a robust, client-server architecture:

```
[ User Browser (HTML5/CSS3/Vanilla JS) ]
                  │
                  ▼ HTTP POST /api/classify { item: string }
[ Express.js Backend Server (Node.js) ]
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
 [ Gemini API Live ]   [ Predefined Offline KB ]
  (gemini-2.5-flash)     (40+ Verified Items)
  (Structured JSON)      (Deterministic Rules)
        └─────────┬─────────┘
                  ▼ Structured Response Object
[ Browser UI: Result Card + LocalStorage History + Live Dashboard ]
```

### Key Architectural Pillars:
* **LLM Semantic Grounding:** The Google Gemini API is prompted with structured JSON schema constraints to evaluate material composition, recyclability, and handling risks.
* **Offline Knowledge Fallback:** If the API key is not configured or network connectivity drops, the system matches input against a structured offline database of verified household waste profiles.
* **Strict Source Transparency:** When running in fallback mode, the application explicitly informs the user that guidance is sourced from the educational reference knowledge base, avoiding deceptive AI claims.
* **Edge-side Persistence:** All search history, item views, and dashboard metrics are computed in real time within the browser's `localStorage`.

---

## 6. System Features

| Feature ID | Feature Name | Description |
|---|---|---|
| **F-01** | **Intuitive Search & Quick Chips** | Clean search input with quick-select chips for representative household items. |
| **F-02** | **Multi-Stream Classification** | Classifies items into 8 color-coded canonical streams with recommended bin colors. |
| **F-03** | **Detailed Actionable Advice** | Displays material composition, step-by-step disposal procedures, recycling tips, and safety cautions. |
| **F-04** | **Dual AI / Offline Resiliency** | Seamless transition between live Gemini LLM analysis and verified local database. |
| **F-05** | **Local Dashboard & Statistics** | Computes real metrics: total classified items, unique categories discovered, and top category. |
| **F-06** | **Search History Management** | View past classifications, re-open past results, and clear history via an accessible confirmation modal. |
| **F-07** | **Educational Recycling Rules** | 6 actionable tips addressing wishcycling, pizza box grease, e-waste, and resin identification codes. |
| **F-08** | **Accessible, Responsive UI** | WCAG AA compliant contrast, dark/light theme toggle, semantic HTML5, and responsive mobile layouts. |

---

## 7. Technology Stack
* **Frontend:**
  - **HTML5:** Semantic architecture (`<main>`, `<section>`, `<article>`, `<dialog>`, `<aside>`).
  - **CSS3:** Custom properties (CSS variables), responsive flexbox and grid layouts, glassmorphism, micro-animations.
  - **Vanilla JavaScript (ES6+):** Fetch API, DOM manipulation, client-side validation, `localStorage` state management.
* **Backend:**
  - **Node.js (v20+):** High-efficiency event-driven asynchronous runtime.
  - **Express.js (v4.x):** RESTful API router serving JSON endpoints and static assets.
  - **@google/genai:** Official Google Gen AI SDK utilizing structured JSON schemas.
  - **dotenv:** Environment variable isolation protecting secret API keys.
  - **cors:** Controlled cross-origin resource sharing.
* **Hosting & Deployment:**
  - **Render:** Cloud platform deployment serving both Express backend and frontend static assets from a single containerized process.

---

## 8. Implementation Methodology
The project follows an iterative 5-phase engineering lifecycle:

1. **Requirements & Domain Modeling:** Identification of 8 canonical municipal waste categories and aggregation of reference items.
2. **Backend API Engineering:** Implementation of Express REST endpoints, input sanitization, sliding-window rate limiting (30 req/min), and Gemini schema design.
3. **Resilient Knowledge Base Integration:** Construction of offline keyword and heuristic matching rules ensuring continuous operation without active cloud credentials.
4. **Frontend UI & Accessibility Implementation:** Building the responsive design system, theme switcher, native `<dialog>` modal, and `localStorage` dashboard calculations.
5. **Automated Testing & Security Audit:** Execution of automated tests covering status endpoints, input boundaries, canonical category mapping, and verification that no API keys are exposed to the browser.

---

## 9. Alignment with UN Sustainable Development Goal 12
EcoSort AI directly supports **UN SDG 12: Ensure sustainable consumption and production patterns**:
* **Target 12.5 (Waste Prevention, Reduction, Recycling & Reuse):** By clarifying whether an item is recyclable and how to properly prepare it (rinsing, removing non-recyclable lids, avoiding grease), the tool minimizes contamination at the source, preventing recyclable batches from being rejected at Material Recovery Facilities (MRFs).
* **Target 12.8 (Universal Information for Sustainable Development):** Educates consumers on the chemical hazards of batteries, the value of e-waste urban mining, and the lifecycle implications of single-use plastics.

---

## 10. Expected Outcomes
1. **Reduced Household Sorting Errors:** Decreased incidence of contaminated recycling bins among active users.
2. **Increased Consumer Awareness:** Greater familiarity with resin identification codes (1-7) and proper e-waste disposal channels.
3. **Demonstrable Academic Prototype:** A production-ready, fully testable open-source software artifact that demonstrates responsible AI engineering for environmental stewardship.

---

## 11. System Limitations
* **Educational Guidance Only:** EcoSort AI is an educational assistant and cannot replace official statutory guidelines issued by municipal sanitation authorities.
* **Regional Variation:** Municipal waste collection rules vary across countries, states, and city councils (e.g., some municipalities accept glass in curbside single-stream bins, while others require drop-off centers).
* **Text-Based Query Input:** Current implementation requires textual item description; camera-based image recognition is not included in this iteration.
* **No Direct Physical Verification:** The system relies on user descriptions; it cannot physically verify whether a bottle has been rinsed clean of food residues.

---

## 12. Future Scope
1. **Computer Vision Integration:** Multi-modal image classification allowing users to snap a photo of an item using their smartphone camera for instant recognition.
2. **Geo-Location Based Municipal Rules:** Integration with civic municipal GIS open data to tailor bin colors and collection schedules to the user's specific postal code.
3. **Barcode / Packaging UPC Scanning:** Automated material breakdown retrieval by scanning consumer product barcodes.
4. **Gamification & Community Challenges:** Local neighborhood leaderboards tracking household segregation streaks and collective waste reduction.

---

## 13. References
1. **World Bank (2018).** *What a Waste 2.0: A Global Snapshot of Solid Waste Management to 2050.* Urban Development Series.
2. **United Nations Environment Programme (UNEP, 2021).** *Global Waste Management Outlook 2.* UN Publications.
3. **United Nations Department of Economic and Social Affairs (UNDESA).** *Sustainable Development Goal 12: Responsible Consumption and Production.* https://sdgs.un.org/goals/goal12
4. **Google Cloud (2025).** *Gemini API Structured Outputs & Developer Documentation.* https://ai.google.dev/docs
5. **IBM SkillsBuild (2026).** *Masterclass 5 AI & Emerging Tech Project Guidelines.*
