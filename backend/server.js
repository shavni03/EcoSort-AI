/**
 * EcoSort AI - Server Application
 * 
 * Node.js & Express backend for AI-powered waste classification and recycling guidance.
 * Built for IBM SkillsBuild Masterclass 5 | Aligns with UN SDG 12
 * 
 * Security:
 * - Keeps Gemini API key server-side in environment variables
 * - Enforces request size limits (10kb)
 * - Basic sliding-window rate limiting per IP (30 requests/min)
 * - Strict input validation & sanitization
 * - Safe error handling with zero secret leakage
 * - Offline fallback knowledge base when AI key is missing or unavailable
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env if present
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config(); // fallback to current working directory .env

let GoogleGenAI;
try {
  const genaiModule = require('@google/genai');
  GoogleGenAI = genaiModule.GoogleGenAI;
} catch (err) {
  console.warn('[EcoSort AI] @google/genai module load warning:', err.message);
}

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

// Canonical Waste Categories
const CANONICAL_CATEGORIES = [
  'Wet or Organic Waste',
  'Recyclable Paper and Cardboard',
  'Plastic Waste',
  'Glass Waste',
  'Metal Waste',
  'Electronic Waste (E-Waste)',
  'General or Non-Recyclable Waste',
  'Hazardous or Special-Handling Waste'
];

// Offline Reference Knowledge Base for Predefined Fallbacks
const OFFLINE_KNOWLEDGE_BASE = [
  {
    keywords: ['plastic bottle', 'water bottle', 'soda bottle', 'pet bottle', 'coke bottle'],
    item: 'Plastic Water / Beverage Bottle (PET #1)',
    category: 'Plastic Waste',
    explanation: 'Clear polyethylene terephthalate (PET #1) bottles are widely recyclable when clean.',
    disposal_method: 'Empty liquid completely, lightly rinse, crush to save space, replace cap tightly, and place in the dry recyclables / plastics bin (typically blue or yellow bin depending on local municipality).',
    recycling_tip: 'Re-screw the plastic cap onto the bottle after crushing; loose caps often slip through sorting screens at MRFs (Material Recovery Facilities).',
    safety_notes: 'Rinse out any sugary residual fluids to prevent mold and insect attraction during curbside collection.',
    confidence_level: 'High'
  },
  {
    keywords: ['banana peel', 'fruit peel', 'apple core', 'vegetable scraps', 'fruit scrap'],
    item: 'Banana Peel / Fruit Scraps',
    category: 'Wet or Organic Waste',
    explanation: 'Pure organic plant matter is 100% biodegradable and rich in potassium and nitrogen.',
    disposal_method: 'Deposit into your green organic waste bin or home compost heap.',
    recycling_tip: 'Add to home compost along with dry leaves (brown carbon material) for nutrient-dense garden fertilizer.',
    safety_notes: 'Remove plastic sticker tags before composting, as they do not decompose.',
    confidence_level: 'High'
  },
  {
    keywords: ['newspaper', 'newsprint', 'old paper', 'magazine'],
    item: 'Newspaper / Print Publication',
    category: 'Recyclable Paper and Cardboard',
    explanation: 'Clean cellulose fibers can be pulped and recycled 5 to 7 times into new paper products.',
    disposal_method: 'Keep completely dry and flat. Place into the paper recycling bin (typically blue bin).',
    recycling_tip: 'Can be reused as biodegradable weed barrier in gardening, shelf lining, or eco-friendly package padding.',
    safety_notes: 'Keep away from moisture, grease, or chemical cleaners, which weaken paper fibers and cause recycling rejection.',
    confidence_level: 'High'
  },
  {
    keywords: ['cardboard box', 'shipping box', 'amazon box', 'corrugated box'],
    item: 'Corrugated Cardboard Box',
    category: 'Recyclable Paper and Cardboard',
    explanation: 'Corrugated cardboard is among the most recycled packaging materials globally.',
    disposal_method: 'Flatten all boxes completely to conserve bin capacity. Place in paper/cardboard recycling.',
    recycling_tip: 'Remove excess plastic packaging tape, shipping labels, and bubble wrap before recycling.',
    safety_notes: 'Check for staples or packaging clips; remove them if protruding to prevent injury to sanitation handlers.',
    confidence_level: 'High'
  },
  {
    keywords: ['pizza box', 'greasy pizza box', 'food stained box'],
    item: 'Greasy Pizza Delivery Box',
    category: 'General or Non-Recyclable Waste',
    explanation: 'Food oils and animal grease permanently soak into cardboard fibers and cannot be washed out during paper pulping.',
    disposal_method: 'Tear off clean, oil-free top lids and recycle them as cardboard. Place greasy food-stained bottoms into general waste or municipal food compost if accepted.',
    recycling_tip: 'Compost unbleached greasy cardboard in municipal composting if food-soiled paper is accepted locally.',
    safety_notes: 'Do not mix greasy pizza boxes into standard dry paper recycling bins as a single greasy box can ruin an entire paper batch.',
    confidence_level: 'High'
  },
  {
    keywords: ['glass jar', 'jam jar', 'mason jar', 'pasta sauce jar'],
    item: 'Glass Food Jar',
    category: 'Glass Waste',
    explanation: 'Container glass is 100% infinitely recyclable without any loss in purity or quality.',
    disposal_method: 'Rinse food residue thoroughly, separate the metal lid for separate recycling, and place in glass recycling or designated drop-off station.',
    recycling_tip: 'Wash thoroughly and repurpose at home for pantry storage, spice organization, or plant propagation.',
    safety_notes: 'Do not break or shatter glass before disposal. Only container glass (bottles/jars) belongs here—not drinking glasses or cookware.',
    confidence_level: 'High'
  },
  {
    keywords: ['broken drinking glass', 'mirror', 'window glass', 'light bulb', 'pyrex'],
    item: 'Broken Drinking Glass / Window Glass / Pyrex',
    category: 'General or Non-Recyclable Waste',
    explanation: 'Drinking tumblers, ceramics, mirrors, and Pyrex have different melting temperatures than bottle glass and cannot be mixed in glass recycling.',
    disposal_method: 'Wrap securely in multiple layers of old newspaper or thick cardboard, tape closed, and mark "BROKEN GLASS" before placing in general household waste.',
    recycling_tip: 'Consider mosaic craft projects for broken colored ceramics or decorative glass fragments.',
    safety_notes: 'Always wrap securely to prevent puncture injuries to sanitation workers and refuse collection staff.',
    confidence_level: 'High'
  },
  {
    keywords: ['aluminum can', 'soda can', 'coke can', 'tin can', 'beer can'],
    item: 'Aluminum Beverage Can',
    category: 'Metal Waste',
    explanation: 'Aluminum recycling saves up to 95% of the energy needed to refine new metal from bauxite ore.',
    disposal_method: 'Rinse to remove sugary residues, drain, crush lightly, and place into metal recycling.',
    recycling_tip: 'Aluminum can return to store shelves as a new can in as little as 60 days.',
    safety_notes: 'Watch sharp edges if the pop-tab opening has jagged edges.',
    confidence_level: 'High'
  },
  {
    keywords: ['battery', 'lithium battery', 'aa battery', 'aaa battery', 'cell phone battery', 'rechargeable battery'],
    item: 'Household / Rechargeable Battery',
    category: 'Hazardous or Special-Handling Waste',
    explanation: 'Batteries contain heavy metals (lithium, nickel, cadmium, lead) and pose severe chemical and fire hazards.',
    disposal_method: 'NEVER put batteries in regular trash or standard recycling bins. Drop off at local electronic waste / battery collection centers, hardware stores, or municipal hazardous depots.',
    recycling_tip: 'Tape the positive terminal with non-conductive clear tape before dropping off to prevent short-circuits during transport.',
    safety_notes: 'Lithium-ion batteries can violently ignite or cause garbage truck and sorting facility fires if crushed.',
    confidence_level: 'High'
  },
  {
    keywords: ['old phone', 'smartphone', 'laptop', 'charger', 'computer cable', 'e-waste', 'electronics'],
    item: 'End-of-Life Smartphone / Small Electronics',
    category: 'Electronic Waste (E-Waste)',
    explanation: 'Consumer electronics contain valuable precious metals (gold, copper, silver) alongside toxic materials like brominated flame retardants.',
    disposal_method: 'Take to certified e-waste recyclers, authorized manufacturer trade-in drop-offs, or civic electronics collection drives.',
    recycling_tip: 'Factory-reset device to wipe personal data, and donate or sell if still functional.',
    safety_notes: 'Do not attempt to puncture or pry open sealed lithium battery compartments.',
    confidence_level: 'High'
  },
  {
    keywords: ['paint can', 'solvent', 'bleach', 'insecticide', 'pesticide', 'chemical cleaner'],
    item: 'Paint Can / Household Chemical Container',
    category: 'Hazardous or Special-Handling Waste',
    explanation: 'Solvents, leftover paints, and pesticides contaminate groundwater and produce toxic fumes if landfilled.',
    disposal_method: 'Take to a designated Municipal Household Hazardous Waste (HHW) drop-off facility.',
    recycling_tip: 'Donate usable leftover paint to community theatre groups, schools, or non-profit housing programs.',
    safety_notes: 'Keep in original labeled containers. Never pour chemical residues down domestic sinks or storm drains.',
    confidence_level: 'High'
  },
  {
    keywords: ['styrofoam', 'polystyrene', 'thermocol', 'foam cup', 'foam food box'],
    item: 'Expanded Polystyrene (Styrofoam / Thermocol)',
    category: 'General or Non-Recyclable Waste',
    explanation: 'Styrofoam is 95% air and easily breaks into microscopic non-biodegradable beads that contaminate ecosystems.',
    disposal_method: 'Place in the general non-recyclable waste bin unless your municipality has specialized drop-off densification programs.',
    recycling_tip: 'Reuse clean packaging blocks for shipping delicate items or storage protection.',
    safety_notes: 'Avoid microwaving or heating food in polystyrene, and keep away from open flames.',
    confidence_level: 'High'
  },
  {
    keywords: ['potato chips bag', 'snack wrapper', 'chips packet', 'biscuit wrapper', 'crisp packet'],
    item: 'Multi-layer Foil Snack / Chip Wrapper (Metallized Film)',
    category: 'General or Non-Recyclable Waste',
    explanation: 'Multi-layer packaging fuses plastic film with microscopic aluminum vapor, making mechanical separation impossible in standard curbside sorting.',
    disposal_method: 'Place in standard household general / landfill waste.',
    recycling_tip: 'Look for specialized Terracycle or supermarket soft plastic drop-off bins if available in your region.',
    safety_notes: 'Do not burn plastic foil packaging, as burning releases toxic dioxins and particulate smoke.',
    confidence_level: 'High'
  },
  {
    keywords: ['egg carton', 'paper egg tray'],
    item: 'Molded Pulp Egg Carton',
    category: 'Recyclable Paper and Cardboard',
    explanation: 'Made from recycled paper pulp, clean molded egg cartons are biodegradable and easily recyclable.',
    disposal_method: 'Place in paper recycling if clean and dry, or shred for backyard composting.',
    recycling_tip: 'Excellent for seed starting in gardening—plant directly into soil as the carton biodegrades.',
    safety_notes: 'If contaminated by broken raw egg yolks, discard in organic compost rather than dry paper bins.',
    confidence_level: 'High'
  },
  {
    keywords: ['coffee grounds', 'used coffee', 'tea bag', 'tea leaves'],
    item: 'Coffee Grounds / Tea Leaves',
    category: 'Wet or Organic Waste',
    explanation: 'Organic waste high in nitrogen and organic matter that accelerates soil composting.',
    disposal_method: 'Place in green organic waste bin or add directly into garden compost.',
    recycling_tip: 'Mix directly into garden soil around acid-loving plants like tomatoes, roses, and hydrangeas.',
    safety_notes: 'Ensure tea bags are 100% paper/cellulose; remove plastic staple or synthetic nylon pyramid bags before composting.',
    confidence_level: 'High'
  }
];

// In-Memory Rate Limiter (Sliding Window per IP)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30; // 30 requests per minute

function rateLimiter(req, res, next) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  const record = rateLimitMap.get(ip) || { count: 0, startTime: now };

  if (now - record.startTime > RATE_LIMIT_WINDOW_MS) {
    record.count = 1;
    record.startTime = now;
  } else {
    record.count += 1;
  }

  rateLimitMap.set(ip, record);

  // Set standard rate limit headers
  res.setHeader('X-RateLimit-Limit', MAX_REQUESTS_PER_WINDOW);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS_PER_WINDOW - record.count));

  if (record.count > MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.ceil((record.startTime + RATE_LIMIT_WINDOW_MS - now) / 1000);
    res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({
      error: 'Rate limit exceeded. Please wait a moment before submitting another classification request.',
      retryAfterSeconds: retryAfter
    });
  }

  next();
}

// Clean up stale rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now - record.startTime > RATE_LIMIT_WINDOW_MS * 2) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10kb' })); // Limit request size to 10kb

// Serve frontend static files
const frontendDir = path.resolve(__dirname, '../frontend');
app.use(express.static(frontendDir));

/**
 * Health & Configuration Status Check
 * Safe endpoint: Never leaks API keys
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    application: 'EcoSort AI',
    version: '1.0.0',
    sdg_alignment: 'UN SDG 12: Responsible Consumption and Production',
    ai_service: {
      provider: 'Google Gemini',
      model: GEMINI_MODEL,
      configured: Boolean(GEMINI_API_KEY && GEMINI_API_KEY.trim().length > 0)
    },
    canonical_categories: CANONICAL_CATEGORIES.length,
    timestamp: new Date().toISOString()
  });
});

/**
 * Waste Categories Reference Endpoint
 */
app.get('/api/categories', (req, res) => {
  res.json({
    categories: [
      {
        name: 'Wet or Organic Waste',
        color: '#10b981',
        icon: '🌱',
        bin_color: 'Green Bin',
        summary: 'Kitchen scraps, vegetable peels, leftovers, and garden trimmings that decompose naturally.',
        examples: ['Fruit peels', 'Vegetable cut-offs', 'Tea leaves', 'Coffee grounds', 'Egg shells']
      },
      {
        name: 'Recyclable Paper and Cardboard',
        color: '#3b82f6',
        icon: '📦',
        bin_color: 'Blue Bin',
        summary: 'Clean dry paper, newspapers, magazines, cartons, and corrugated boxes.',
        examples: ['Newspaper', 'Cardboard shipping box', 'Office paper', 'Notebooks', 'Egg trays']
      },
      {
        name: 'Plastic Waste',
        color: '#f59e0b',
        icon: '🧴',
        bin_color: 'Yellow / Orange Bin',
        summary: 'Rigid plastic bottles, jugs, tubs, and clean packaging containers.',
        examples: ['PET water bottle', 'HDPE milk jug', 'Detergent bottle', 'Plastic tub']
      },
      {
        name: 'Glass Waste',
        color: '#06b6d4',
        icon: '🍾',
        bin_color: 'Cyan / Glass Drop-off Bin',
        summary: 'Glass bottles and food jars. 100% infinitely recyclable without degrading.',
        examples: ['Jam jars', 'Beverage bottles', 'Olive oil bottles', 'Glass sauce containers']
      },
      {
        name: 'Metal Waste',
        color: '#64748b',
        icon: '🥫',
        bin_color: 'Grey / Metal Bin',
        summary: 'Aluminum drink cans, steel food tins, clean metal lids, and foil trays.',
        examples: ['Soda can', 'Soup tin', 'Clean aluminum foil', 'Metal jar lids']
      },
      {
        name: 'Electronic Waste (E-Waste)',
        color: '#8b5cf6',
        icon: '📱',
        bin_color: 'Purple / E-Waste Depot',
        summary: 'Defunct electronics, cables, phones, and appliances containing rare metals.',
        examples: ['Smartphone', 'Broken charger', 'Earphones', 'Computer keyboard', 'Printed circuit board']
      },
      {
        name: 'General or Non-Recyclable Waste',
        color: '#71717a',
        icon: '🗑️',
        bin_color: 'Black / Dark Grey Bin',
        summary: 'Items that cannot be recycled in standard facilities due to composite materials or grease.',
        examples: ['Greasy pizza box', 'Chip bags', 'Ceramics', 'Styrofoam', 'Dirty napkins']
      },
      {
        name: 'Hazardous or Special-Handling Waste',
        color: '#ef4444',
        icon: '⚠️',
        bin_color: 'Red / Civic Hazardous Depot',
        summary: 'Chemicals, batteries, medical sharps, and flammables that threaten safety and groundwater.',
        examples: ['Lithium batteries', 'Fluorescent tubes', 'Paint cans', 'Expired medicine', 'Pesticides']
      }
    ]
  });
});

/**
 * Predefined Knowledge Base Lookup Helper
 */
function findOfflineMatch(query) {
  const normalized = query.toLowerCase().trim();

  // Exact or keyword match
  for (const entry of OFFLINE_KNOWLEDGE_BASE) {
    if (entry.keywords.some(k => normalized.includes(k) || k.includes(normalized))) {
      return entry;
    }
  }

  // Broad category heuristics for fallback
  if (normalized.includes('paper') || normalized.includes('book') || normalized.includes('carton') || normalized.includes('envelope')) {
    return {
      item: query,
      category: 'Recyclable Paper and Cardboard',
      explanation: 'General paper and cellulose materials are recyclable provided they remain clean and unsoiled by food.',
      disposal_method: 'Keep dry, flatten, and place in paper recycling bin.',
      recycling_tip: 'Shred for composting or package cushioning if shredded paper is accepted by your local program.',
      safety_notes: 'Do not recycle paper that has been contaminated with grease or bodily fluids.',
      confidence_level: 'Medium'
    };
  }

  if (normalized.includes('plastic') || normalized.includes('pouch') || normalized.includes('container') || normalized.includes('tub')) {
    return {
      item: query,
      category: 'Plastic Waste',
      explanation: 'Plastic polymers vary in recyclability. Rigid plastics (#1 PET and #2 HDPE) have higher recycling acceptance than soft films.',
      disposal_method: 'Rinse out contents thoroughly, check the resin identification number on the bottom, and place in the plastics recycling bin.',
      recycling_tip: 'Compress plastic bottles and re-attach caps to ensure both parts are captured by sorting machinery.',
      safety_notes: 'Ensure chemical residues from cleaning products are rinsed out before disposal.',
      confidence_level: 'Medium'
    };
  }

  if (normalized.includes('food') || normalized.includes('leaf') || normalized.includes('grass') || normalized.includes('rotten')) {
    return {
      item: query,
      category: 'Wet or Organic Waste',
      explanation: 'Biological matter decomposes naturally and produces rich humus through aerobic composting.',
      disposal_method: 'Dispose in your municipal green organic bin or household compost bin.',
      recycling_tip: 'Balance wet food scraps (green nitrogen) with dry leaves or cardboard scraps (brown carbon).',
      safety_notes: 'Avoid placing plastic bags or synthetic wrappers in organic waste streams.',
      confidence_level: 'Medium'
    };
  }

  // Default fallback for general unknown household item
  return {
    item: query,
    category: 'General or Non-Recyclable Waste',
    explanation: 'Classification based on standard household waste guidance. When material composition is unknown or composite, treating as general waste prevents recycling batch contamination.',
    disposal_method: 'Check item packaging for manufacturer recycling symbols. If unverified or mixed-material, dispose in the general household waste bin.',
    recycling_tip: 'Whenever possible, search for manufacturer take-back programs or consult municipal collection guides.',
    safety_notes: 'If this item contains sharp edges, pressurized gas, batteries, or chemical residues, handle with care and route to a civic hazardous waste depot.',
    confidence_level: 'Medium'
  };
}

/**
 * Waste Classification API Endpoint
 * POST /api/classify
 * Body: { item: string }
 */
app.post('/api/classify', rateLimiter, async (req, res) => {
  try {
    const rawItem = req.body && req.body.item;

    // Strict Input Validation
    if (!rawItem || typeof rawItem !== 'string') {
      return res.status(400).json({
        error: 'Invalid input. Please provide a waste item name as text.'
      });
    }

    const trimmedItem = rawItem.trim();

    if (trimmedItem.length < 2) {
      return res.status(400).json({
        error: 'Item name is too short. Please enter a descriptive waste item name (e.g., "plastic bottle", "banana peel").'
      });
    }

    if (trimmedItem.length > 120) {
      return res.status(400).json({
        error: 'Item name is too long. Please limit your query to under 120 characters.'
      });
    }

    // Sanitize basic control characters
    const sanitizedItem = trimmedItem.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

    // Check if Gemini API is configured
    if (!GEMINI_API_KEY || !GoogleGenAI) {
      const fallbackResult = findOfflineMatch(sanitizedItem);
      return res.json({
        ...fallbackResult,
        is_fallback: true,
        source: 'Predefined Offline Reference Knowledge Base',
        notice: 'Note: Gemini API key is not configured on the backend. This response was retrieved from our verified educational reference knowledge base. Configure GEMINI_API_KEY in backend/.env to enable live AI classification.',
        local_rules_notice: 'Local waste collection guidelines vary across cities and countries. Always verify with your local municipality or waste management provider.'
      });
    }

    // Call Gemini API with Structured JSON Schema & Multi-Model Fallback
    try {
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

      const prompt = `You are an expert waste classification and recycling guidance system supporting UN Sustainable Development Goal 12 (Responsible Consumption and Production).
Analyze the following household item: "${sanitizedItem}".
Accurately categorize it into exactly one of these 8 canonical categories:
- Wet or Organic Waste
- Recyclable Paper and Cardboard
- Plastic Waste
- Glass Waste
- Metal Waste
- Electronic Waste (E-Waste)
- General or Non-Recyclable Waste
- Hazardous or Special-Handling Waste

Provide clear, responsible, educational guidance. Emphasize that contamination must be avoided and local municipal rules vary.`;

      // Candidate models in preference order
      const candidateModels = Array.from(new Set([
        GEMINI_MODEL,
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-2.5-flash'
      ].filter(Boolean)));

      let lastError = null;
      let responseText = '';
      let usedModel = GEMINI_MODEL;

      for (const modelCandidate of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model: modelCandidate,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'OBJECT',
                properties: {
                  item: {
                    type: 'STRING',
                    description: 'Clear name of the item classified'
                  },
                  category: {
                    type: 'STRING',
                    description: 'One of the 8 canonical categories',
                    enum: CANONICAL_CATEGORIES
                  },
                  explanation: {
                    type: 'STRING',
                    description: 'Why this item belongs to this category (material composition, biodegradability, or recyclability)'
                  },
                  disposal_method: {
                    type: 'STRING',
                    description: 'Specific bin or disposal steps to take (e.g., rinse, flatten, bin color)'
                  },
                  recycling_tip: {
                    type: 'STRING',
                    description: 'Practical recycling, reuse, or upcycling suggestion'
                  },
                  safety_notes: {
                    type: 'STRING',
                    description: 'Safety precautions (e.g. sharp edges, battery fire risk, toxins, or "None identified")'
                  },
                  confidence_level: {
                    type: 'STRING',
                    description: 'Confidence in classification',
                    enum: ['High', 'Medium', 'Low']
                  }
                },
                required: ['item', 'category', 'explanation', 'disposal_method', 'recycling_tip', 'safety_notes']
              }
            }
          });

          if (response && response.text) {
            responseText = response.text.trim();
            usedModel = modelCandidate;
            break;
          }
        } catch (candidateErr) {
          lastError = candidateErr;
          console.warn(`[EcoSort AI] Model ${modelCandidate} failed (${candidateErr.message}), trying next candidate if available...`);
        }
      }

      if (!responseText) {
        throw (lastError || new Error('All candidate Gemini models failed to generate content'));
      }

      const parsedData = JSON.parse(responseText);

      // Validate parsed data against required structure
      if (!parsedData.category || !parsedData.disposal_method) {
        throw new Error('Incomplete data structure from Gemini model');
      }

      // Ensure category matches canonical list
      const matchedCategory = CANONICAL_CATEGORIES.find(
        c => c.toLowerCase() === parsedData.category.toLowerCase()
      ) || parsedData.category;

      return res.json({
        item: parsedData.item || sanitizedItem,
        category: matchedCategory,
        explanation: parsedData.explanation,
        disposal_method: parsedData.disposal_method,
        recycling_tip: parsedData.recycling_tip,
        safety_notes: parsedData.safety_notes || 'No special hazards noted. Follow standard waste segregation hygiene.',
        confidence_level: parsedData.confidence_level || 'High',
        is_fallback: false,
        source: 'Google Gemini AI (Live)',
        local_rules_notice: 'Local municipal waste collection rules vary by region. Please confirm with your local civic authority.'
      });

    } catch (aiError) {
      console.warn('[EcoSort AI] Gemini API call error:', aiError.message);

      // Fallback gracefully to offline verified knowledge base
      const fallbackResult = findOfflineMatch(sanitizedItem);
      return res.json({
        ...fallbackResult,
        is_fallback: true,
        source: 'Predefined Offline Reference Knowledge Base',
        notice: `Notice: Live AI classification encountered an error (${aiError.message || 'service temporarily unavailable'}). Showing verified reference guidance from our educational knowledge base.`,
        local_rules_notice: 'Local municipal waste collection rules vary by region. Always verify with your local civic authority.'
      });
    }

  } catch (error) {
    console.error('[EcoSort AI] Server error handling /api/classify:', error);
    return res.status(500).json({
      error: 'An internal error occurred while processing your request. Please try again.'
    });
  }
});

// Fallback route: serve frontend index.html for any unhandled page request
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

// Start Server with Port Fallback
function startServer(targetPort) {
  const srv = app.listen(targetPort, () => {
    console.log('====================================================');
    console.log('🌱 EcoSort AI: Waste Classification & Recycling');
    console.log(`📡 Server running on: http://localhost:${targetPort}`);
    console.log(`🤖 AI Status: ${GEMINI_API_KEY ? 'Active (Gemini ' + GEMINI_MODEL + ')' : 'Offline Knowledge Base Mode (No API key set)'}`);
    console.log(`🌍 SDG Alignment: Goal 12 (Responsible Consumption)`);
    console.log('====================================================');
  });

  srv.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[EcoSort AI] Port ${targetPort} is in use, trying port ${Number(targetPort) + 1}...`);
      startServer(Number(targetPort) + 1);
    } else {
      console.error('[EcoSort AI] Fatal server error:', err);
    }
  });

  return srv;
}

if (require.main === module) {
  startServer(PORT);
}

module.exports = app;

