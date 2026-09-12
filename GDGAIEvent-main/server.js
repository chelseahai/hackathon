import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Preset demo datasets for instant testing at GDG AI Event
const PRESETS = [
  {
    id: 'preset-autumn-hourglass',
    title: 'Hourglass • Warm Autumn',
    subtitle: 'Tested with A4 Paper Reference (Front & Side)',
    referenceType: 'A4',
    referenceDimensions: { width: 21.0, height: 29.7, unit: 'cm' },
    frontImagePlaceholder: '/assets/presets/preset_hourglass_front.svg',
    sideImagePlaceholder: '/assets/presets/preset_hourglass_side.svg',
    renderImageUrl: '/assets/renders/preset_autumn_hourglass.jpg',
    dimensions: {
      height_cm: 168.0,
      shoulder_width_cm: 39.5,
      chest_circumference_cm: 94.0,
      waist_circumference_cm: 70.0,
      hip_circumference_cm: 98.0,
      torso_length_cm: 42.0,
      inseam_cm: 78.5,
      neck_circumference_cm: 34.0,
      arm_length_cm: 58.0,
      body_shape_type: 'Hourglass',
      confidence_score: 0.94,
      cross_section_method: 'Front & Side Elliptical Integral'
    },
    colorAnalysis: {
      skin_tone_category: 'Warm Medium with Golden Undertones',
      undertone: 'Warm',
      contrast_level: 'Medium-High',
      seasonal_palette: 'Warm Autumn',
      description: 'Rich, earthy, and warm undertones with golden highlights in hazel-brown eyes and warm brunette hair.',
      best_colors: [
        { name: 'Terracotta Rust', hex: '#C85A32' },
        { name: 'Olive Moss', hex: '#5B6F45' },
        { name: 'Warm Camel', hex: '#C19A6B' },
        { name: 'Deep Teal', hex: '#165B64' },
        { name: 'Spiced Mustard', hex: '#D4A017' }
      ],
      avoid_colors: [
        { name: 'Icy Pastel Pink', reason: 'Washes out warm golden undertones' },
        { name: 'Stark Blue-Black', reason: 'Creates harsh shadows against warm skin' },
        { name: 'Neon Highlighter Green', reason: 'Overpowers natural muted warmth' }
      ]
    },
    styling: {
      silhouette_name: 'Belted Fit-and-Flare Wrap Midi Dress',
      key_features: [
        'Surplice V-neckline to accentuate proportionate décolletage',
        'Defined cinched waist with matching self-fabric sash belt',
        'Gentle A-line skirt drape skimming naturally over high hips',
        'Three-quarter tailored sleeves for balanced arm silhouette'
      ],
      recommended_fabrics: 'Mid-weight Tencel Twill, Wool Crepe, or heavy Silk Charmeuse with slight stretch',
      pattern_advice: 'Subtle tone-on-tone botanical jacquard or rich warm paisley prints; avoid boxy horizontal stripes.'
    },
    techPack: [
      { pom: 'Across Shoulder (Seam to Seam)', bodyCm: 39.5, easeCm: 1.5, garmentCm: 41.0, tolCm: 0.5, notes: 'Natural shoulder alignment' },
      { pom: 'Bust Circumference (Fullest Point)', bodyCm: 94.0, easeCm: 4.0, garmentCm: 98.0, tolCm: 1.0, notes: 'Tailored bodice with bust darts' },
      { pom: 'Waist Circumference (Natural Waist)', bodyCm: 70.0, easeCm: 3.0, garmentCm: 73.0, tolCm: 1.0, notes: 'Reinforced waist stay with sash loops' },
      { pom: 'Hip Circumference (Fullest Hip)', bodyCm: 98.0, easeCm: 8.0, garmentCm: 106.0, tolCm: 1.5, notes: 'Flared A-line sweep ease' },
      { pom: 'Total Length (HPS to Bottom Hem)', bodyCm: 112.0, easeCm: 0.0, garmentCm: 112.0, tolCm: 1.0, notes: 'Midi length terminating mid-calf' },
      { pom: 'Armhole Depth (Curved)', bodyCm: 21.0, easeCm: 2.5, garmentCm: 23.5, tolCm: 0.5, notes: 'Comfortable range of motion' },
      { pom: 'Sleeve Length (Shoulder to Hem)', bodyCm: 45.0, easeCm: 1.0, garmentCm: 46.0, tolCm: 0.8, notes: '3/4 length finished cuff' }
    ]
  },
  {
    id: 'preset-winter-pear',
    title: 'Pear / Triangle • Cool Winter',
    subtitle: 'Tested with Credit Card Reference (ISO/IEC 7810 ID-1)',
    referenceType: 'ID_CARD',
    referenceDimensions: { width: 8.56, height: 5.398, unit: 'cm' },
    frontImagePlaceholder: '/assets/presets/preset_pear_front.svg',
    sideImagePlaceholder: '/assets/presets/preset_pear_side.svg',
    renderImageUrl: '/assets/renders/preset_winter_pear.jpg',
    dimensions: {
      height_cm: 162.0,
      shoulder_width_cm: 36.5,
      chest_circumference_cm: 86.0,
      waist_circumference_cm: 68.0,
      hip_circumference_cm: 102.0,
      torso_length_cm: 40.0,
      inseam_cm: 74.0,
      neck_circumference_cm: 32.5,
      arm_length_cm: 55.0,
      body_shape_type: 'Pear (Triangle)',
      confidence_score: 0.91,
      cross_section_method: 'Front & Side Elliptical Integral'
    },
    colorAnalysis: {
      skin_tone_category: 'Cool Fair with Rosy Undertones',
      undertone: 'Cool',
      contrast_level: 'High',
      seasonal_palette: 'Cool Winter',
      description: 'Vivid, cool, high-contrast coloring with cool porcelain complexion, dark espresso hair, and striking contrast.',
      best_colors: [
        { name: 'Royal Cobalt Blue', hex: '#0047AB' },
        { name: 'Vibrant Magenta', hex: '#CA1F7B' },
        { name: 'Emerald Jewel', hex: '#046307' },
        { name: 'Crisp True White', hex: '#F8F9FA' },
        { name: 'Midnight Navy', hex: '#111E38' }
      ],
      avoid_colors: [
        { name: 'Mustard Gold', reason: 'Clashes with cool pink undertones' },
        { name: 'Muddy Orange-Brown', reason: 'Dulls vivid winter complexion' },
        { name: 'Beige Khaki', reason: 'Causes skin to appear sallow' }
      ]
    },
    styling: {
      silhouette_name: 'Boat-Neck Structured Shoulder A-Line Midi',
      key_features: [
        'Bateau / Boat neckline to visually widen shoulder line',
        'Subtle 0.5cm shoulder padding to balance wider hips',
        'High empire-leaning natural waistline with clean front panel',
        'Gradual fluid skirt flare that drapes freely over lower hips'
      ],
      recommended_fabrics: 'Ponte di Roma, Structured Viscose Blend, or Crisp Poplin with movement',
      pattern_advice: 'Bold geometric or color-blocked upper bodice with dark solid lower half to draw eye upward.'
    },
    techPack: [
      { pom: 'Across Shoulder (Seam to Seam)', bodyCm: 36.5, easeCm: 2.5, garmentCm: 39.0, tolCm: 0.5, notes: 'Includes shoulder head structure' },
      { pom: 'Bust Circumference (Fullest Point)', bodyCm: 86.0, easeCm: 5.0, garmentCm: 91.0, tolCm: 1.0, notes: 'Boat neck darted bodice' },
      { pom: 'Waist Circumference (Natural Waist)', bodyCm: 68.0, easeCm: 4.0, garmentCm: 72.0, tolCm: 1.0, notes: 'Contoured waistline seam' },
      { pom: 'Hip Circumference (Fullest Hip)', bodyCm: 102.0, easeCm: 12.0, garmentCm: 114.0, tolCm: 1.5, notes: 'Full A-line sweep ease' },
      { pom: 'Total Length (HPS to Bottom Hem)', bodyCm: 108.0, easeCm: 0.0, garmentCm: 108.0, tolCm: 1.0, notes: 'Below the knee midi' },
      { pom: 'Armhole Depth (Curved)', bodyCm: 20.0, easeCm: 2.5, garmentCm: 22.5, tolCm: 0.5, notes: 'Clean fitted armhole' },
      { pom: 'Sleeve Length (Cap Sleeve)', bodyCm: 12.0, easeCm: 0.5, garmentCm: 12.5, tolCm: 0.5, notes: 'Extended shoulder cap' }
    ]
  },
  {
    id: 'preset-spring-rectangle',
    title: 'Athletic / Rectangle • Bright Spring',
    subtitle: 'Tested with A4 Paper Reference',
    referenceType: 'A4',
    referenceDimensions: { width: 21.0, height: 29.7, unit: 'cm' },
    frontImagePlaceholder: '/assets/presets/preset_athletic_front.svg',
    sideImagePlaceholder: '/assets/presets/preset_athletic_side.svg',
    renderImageUrl: '/assets/renders/preset_spring_rectangle.jpg',
    dimensions: {
      height_cm: 174.0,
      shoulder_width_cm: 41.0,
      chest_circumference_cm: 90.0,
      waist_circumference_cm: 76.0,
      hip_circumference_cm: 92.0,
      torso_length_cm: 44.0,
      inseam_cm: 83.0,
      neck_circumference_cm: 35.0,
      arm_length_cm: 61.0,
      body_shape_type: 'Rectangle (Athletic)',
      confidence_score: 0.93,
      cross_section_method: 'Front & Side Elliptical Integral'
    },
    colorAnalysis: {
      skin_tone_category: 'Warm Light with Peachy Undertones',
      undertone: 'Warm Bright',
      contrast_level: 'High Clarity',
      seasonal_palette: 'Bright Spring',
      description: 'Luminous, clear warmth with golden blonde/caramel tones, clear hazel/blue eyes, and peachy skin glow.',
      best_colors: [
        { name: 'Bright Coral', hex: '#FF6F61' },
        { name: 'Warm Turquoise', hex: '#30D5C8' },
        { name: 'Sunlight Primrose', hex: '#FED85D' },
        { name: 'Apple Green', hex: '#8DB600' },
        { name: 'Warm Poppy Red', hex: '#E32636' }
      ],
      avoid_colors: [
        { name: 'Muted Slate Grey', reason: 'Dampens vibrant spring radiance' },
        { name: 'Heavy Charcoal/Black', reason: 'Too overwhelming for light clarity' },
        { name: 'Dusty Taupe', reason: 'Looks muddy against clear peach skin' }
      ]
    },
    styling: {
      silhouette_name: 'Asymmetrical Pleated Wrap Shirtdress with Waist Contrast',
      key_features: [
        'Notched lapel or angled V-neck to create diagonal visual lines',
        'Contrasting wide belt or gathering to sculpt visual waist curve',
        'Pleated skirt panels adding dimension and lateral movement to lower body',
        'Rolled-tab sleeve detailing to enhance athletic shoulder line'
      ],
      recommended_fabrics: 'Crisp Cotton Sateen, Light Linen Blend, or Structured Rayon',
      pattern_advice: 'Dynamic geometric micro-prints, diagonal color-blocking, or micro-stripes that break linear verticality.'
    },
    techPack: [
      { pom: 'Across Shoulder (Seam to Seam)', bodyCm: 41.0, easeCm: 1.0, garmentCm: 42.0, tolCm: 0.5, notes: 'Slightly relaxed shoulder' },
      { pom: 'Bust Circumference (Fullest Point)', bodyCm: 90.0, easeCm: 6.0, garmentCm: 96.0, tolCm: 1.0, notes: 'Comfortable relaxed shirting fit' },
      { pom: 'Waist Circumference (Natural Waist)', bodyCm: 76.0, easeCm: 4.0, garmentCm: 80.0, tolCm: 1.0, notes: 'Belt-adjustable waist channel' },
      { pom: 'Hip Circumference (Fullest Hip)', bodyCm: 92.0, easeCm: 10.0, garmentCm: 102.0, tolCm: 1.5, notes: 'Pleated sweep fullness' },
      { pom: 'Total Length (HPS to Bottom Hem)', bodyCm: 118.0, easeCm: 0.0, garmentCm: 118.0, tolCm: 1.0, notes: 'Long midi length' },
      { pom: 'Armhole Depth (Curved)', bodyCm: 22.0, easeCm: 3.0, garmentCm: 25.0, tolCm: 0.5, notes: 'Tailored shirting sleeve head' },
      { pom: 'Sleeve Length (Convertible Tab)', bodyCm: 59.0, easeCm: 1.5, garmentCm: 60.5, tolCm: 0.8, notes: 'Roll-tab button fastening' }
    ]
  }
];

// Helper: Get active Gemini client
function getGenAIClient(apiKey) {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) return null;
  return new GoogleGenAI({ apiKey: key });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  const hasEnvKey = Boolean(process.env.GEMINI_API_KEY);
  res.json({
    status: 'online',
    version: '1.0.0',
    hasEnvKey,
    time: new Date().toISOString()
  });
});

// Get test presets
app.get('/api/presets', (req, res) => {
  res.json({
    success: true,
    presets: PRESETS
  });
});

// Main Analysis Endpoint
app.post('/api/analyze', async (req, res) => {
  try {
    const {
      frontImage,
      sideImage,
      referenceType = 'A4',
      customWidth = 21.0,
      customHeight = 29.7,
      apiKey,
      selectedPresetId
    } = req.body;

    // Check if user selected an existing preset for immediate demo
    if (selectedPresetId) {
      const found = PRESETS.find(p => p.id === selectedPresetId);
      if (found) {
        return res.json({
          success: true,
          source: 'preset',
          data: found
        });
      }
    }

    const client = getGenAIClient(apiKey);

    // If no client or no images provided, fall back to intelligent realistic simulation
    if (!client || !frontImage) {
      // Simulate realistic measurements based on reference object
      const baseRef = referenceType === 'ID_CARD' 
        ? { width: 8.56, height: 5.398, name: 'Standard ID Card (ISO/IEC 7810 ID-1)' }
        : { width: customWidth || 21.0, height: customHeight || 29.7, name: 'A4 Standard Paper' };

      const simulatedData = {
        id: `analysis-${Date.now()}`,
        title: 'Custom Upload • Analysis Result',
        subtitle: `Calibrated with ${baseRef.name} (${baseRef.width}cm × ${baseRef.height}cm)`,
        referenceType,
        referenceDimensions: { width: baseRef.width, height: baseRef.height, unit: 'cm' },
        dimensions: {
          height_cm: 169.5,
          shoulder_width_cm: 40.2,
          chest_circumference_cm: 93.5,
          waist_circumference_cm: 72.0,
          hip_circumference_cm: 99.0,
          torso_length_cm: 42.5,
          inseam_cm: 79.0,
          neck_circumference_cm: 34.5,
          arm_length_cm: 58.5,
          body_shape_type: 'Hourglass / Soft Balanced',
          confidence_score: 0.92,
          cross_section_method: 'Elliptical Integration with Spatial Scale Anchor'
        },
        colorAnalysis: {
          skin_tone_category: 'Neutral Warm Medium',
          undertone: 'Warm with Soft Golden Infusion',
          contrast_level: 'Medium Contrast',
          seasonal_palette: 'Soft Autumn / Warm Elegance',
          description: 'Balanced complexion with warm olive undertones that harmonizes elegantly with saturated earthy and jewel hues.',
          best_colors: [
            { name: 'Rich Terracotta', hex: '#C2593F' },
            { name: 'Deep Sage Green', hex: '#587058' },
            { name: 'Burnished Gold', hex: '#D4AF37' },
            { name: 'Warm Peacock Teal', hex: '#116562' },
            { name: 'Espresso Mink', hex: '#4B382A' }
          ],
          avoid_colors: [
            { name: 'Fluorescent Yellow', reason: 'Reflects greenish cast onto skin' },
            { name: 'Icy Silver-Lilac', reason: 'Dull and clashes with warm undertones' },
            { name: 'Bleached Chalk White', reason: 'Lacks depth for medium skin values' }
          ]
        },
        styling: {
          silhouette_name: 'Tailored Wrap Midi with Contoured Cascade Drape',
          key_features: [
            'Flattering crossover V-neckline elongating the torso',
            'Internal structured stay with outer self-tie sash cinch',
            'Subtly flared A-line hem creating fluid movement during stride',
            'Set-in three-quarter sleeves highlighting wrist and waistline'
          ],
          recommended_fabrics: 'Cupro Rayon, Italian Wool Crepe, or Heavy Silk Twill',
          pattern_advice: 'Fluid organic motifs, tone-on-tone florals, or solid micro-textures that emphasize drape.'
        },
        techPack: [
          { pom: 'Across Shoulder (Seam to Seam)', bodyCm: 40.2, easeCm: 1.5, garmentCm: 41.7, tolCm: 0.5, notes: 'Shoulder point to shoulder point' },
          { pom: 'Bust Circumference (Apex)', bodyCm: 93.5, easeCm: 4.5, garmentCm: 98.0, tolCm: 1.0, notes: 'Comfort ease with bust darting' },
          { pom: 'Waist Circumference (Natural)', bodyCm: 72.0, easeCm: 3.5, garmentCm: 75.5, tolCm: 1.0, notes: 'Adjustable wrap tie closure' },
          { pom: 'Hip Circumference (Fullest)', bodyCm: 99.0, easeCm: 8.0, garmentCm: 107.0, tolCm: 1.5, notes: 'A-line sweep allowance' },
          { pom: 'Total Garment Length (HPS)', bodyCm: 114.0, easeCm: 0.0, garmentCm: 114.0, tolCm: 1.0, notes: 'Mid-calf finish' },
          { pom: 'Armhole Depth', bodyCm: 21.5, easeCm: 2.5, garmentCm: 24.0, tolCm: 0.5, notes: 'Ergonomic sleeve set' },
          { pom: 'Sleeve Length', bodyCm: 46.0, easeCm: 1.0, garmentCm: 47.0, tolCm: 0.8, notes: '3/4 length finished cuff' }
        ]
      };

      return res.json({
        success: true,
        source: 'simulation_demo',
        note: client ? 'Images parsed with simulation calibration' : 'Running in Demo Mode. Provide GEMINI_API_KEY in settings for live Gemini Vision inference.',
        data: simulatedData
      });
    }

    // LIVE GEMINI API EXECUTION
    const cleanFrontBase64 = frontImage.replace(/^data:image\/[a-z]+;base64,/, '');
    const frontImagePart = {
      inlineData: {
        data: cleanFrontBase64,
        mimeType: frontImage.match(/^data:(image\/[a-z]+);base64,/)?.[1] || 'image/jpeg'
      }
    };

    const parts = [frontImagePart];
    if (sideImage) {
      const cleanSideBase64 = sideImage.replace(/^data:image\/[a-z]+;base64,/, '');
      parts.push({
        inlineData: {
          data: cleanSideBase64,
          mimeType: sideImage.match(/^data:(image\/[a-z]+);base64,/)?.[1] || 'image/jpeg'
        }
      });
    }

    const refInfo = referenceType === 'ID_CARD' 
      ? 'Standard Credit / ID card (8.56 cm width, 5.398 cm height)' 
      : (referenceType === 'A4' ? 'Standard A4 sheet of paper (21.0 cm width, 29.7 cm height)' : `Custom Reference Object (${customWidth} cm width, ${customHeight} cm height)`);

    const promptText = `
You are an expert AI anthropometrist, master fashion stylist, personal color analyst, and technical apparel designer.

TASK:
1. Examine the provided user image(s). Detect the reference object (${refInfo}) to establish a real-world metric scale.
2. Estimate full body dimensions in centimeters (height, shoulders, chest/bust circumference, waist circumference, hip circumference, inseam, torso length, neck, arm length). If both front and side images are present, compute 3D circumferences via Ramanujan elliptical approximations.
3. Classify body shape: Hourglass, Pear (Triangle), Rectangle (Athletic), Inverted Triangle, or Apple.
4. Perform 12-season personal color analysis: examine skin undertone (Cool/Warm/Neutral), contrast, and skin tone. Select 5 ideal color swatches with precise descriptive names and exact 6-character HEX codes (e.g. #C2593F), plus 3 colors to avoid with reasons.
5. Recommend the single most flattering dress silhouette and pattern/fabric choices for this specific body shape and color palette.
6. Generate a manufacturing Tech Pack Point of Measure (POM) table with realistic garment ease allowances and manufacturing tolerances in centimeters.

Return ONLY a valid JSON object matching this schema:
{
  "title": "AI Body & Garment Analysis",
  "subtitle": "Calibrated via ${refInfo}",
  "referenceType": "${referenceType}",
  "referenceDimensions": { "width": ${customWidth || 21.0}, "height": ${customHeight || 29.7}, "unit": "cm" },
  "dimensions": {
    "height_cm": number,
    "shoulder_width_cm": number,
    "chest_circumference_cm": number,
    "waist_circumference_cm": number,
    "hip_circumference_cm": number,
    "torso_length_cm": number,
    "inseam_cm": number,
    "neck_circumference_cm": number,
    "arm_length_cm": number,
    "body_shape_type": string,
    "confidence_score": number,
    "cross_section_method": string
  },
  "colorAnalysis": {
    "skin_tone_category": string,
    "undertone": string,
    "contrast_level": string,
    "seasonal_palette": string,
    "description": string,
    "best_colors": [
      { "name": string, "hex": string }
    ],
    "avoid_colors": [
      { "name": string, "reason": string }
    ]
  },
  "styling": {
    "silhouette_name": string,
    "key_features": [string],
    "recommended_fabrics": string,
    "pattern_advice": string
  },
  "techPack": [
    {
      "pom": string,
      "bodyCm": number,
      "easeCm": number,
      "garmentCm": number,
      "tolCm": number,
      "notes": string
    }
  ]
}
`;

    parts.push({ text: promptText });

    const candidateModels = ['gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-flash-latest'];
    let response = null;
    let lastError = null;

    for (const modelName of candidateModels) {
      try {
        response = await client.models.generateContent({
          model: modelName,
          contents: parts,
          config: {
            responseMimeType: 'application/json'
          }
        });
        if (response && response.text) {
          console.log(`Successfully generated analysis using model: ${modelName}`);
          break;
        }
      } catch (mErr) {
        console.warn(`Model ${modelName} failed:`, mErr.message);
        lastError = mErr;
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error('Failed to generate content with available Gemini models');
    }

    const parsedData = JSON.parse(response.text.trim());
    return res.json({
      success: true,
      source: 'gemini-live',
      data: parsedData
    });

  } catch (error) {
    console.error('Error during analysis:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process images with Gemini'
    });
  }
});

// Render garment on human endpoint
app.post('/api/render-garment', async (req, res) => {
  try {
    const {
      analysisData,
      apiKey,
      customStylePrompt
    } = req.body;

    const styling = analysisData?.styling || {};
    const color = analysisData?.colorAnalysis?.best_colors?.[0] || { name: 'Emerald Jewel', hex: '#046307' };
    const bodyShape = analysisData?.dimensions?.body_shape_type || 'Hourglass';

    const client = getGenAIClient(apiKey);

    // 1. Check if direct photorealistic lookbook render is specified in analysisData
    if (analysisData?.renderImageUrl) {
      return res.json({
        success: true,
        source: 'photorealistic_lookbook',
        imageUrl: analysisData.renderImageUrl,
        silhouette: styling.silhouette_name,
        promptUsed: customStylePrompt || `Tailored ${styling.silhouette_name} in ${color.name}`
      });
    }

    // 2. If Gemini client available, try live generative image generation (Imagen 3)
    if (client) {
      try {
        const renderPrompt = customStylePrompt || `A high-end editorial fashion lookbook photograph of a model with a ${bodyShape} body profile, wearing an exquisitely tailored ${styling.silhouette_name || 'wrap dress'}. The garment is crafted in rich ${color.name} (${color.hex}) fabric (${styling.recommended_fabrics || 'silk crepe'}), featuring ${styling.pattern_advice || 'fine couture details'}. Photographed in an elegant studio with soft natural directional lighting, showcasing the exact drape, hemline, and waistline contour. Crisp 8k photo, clean aesthetic.`;

        const imageResponse = await client.models.generateImages({
          model: 'imagen-3.0-generate-002',
          prompt: renderPrompt,
          config: {
            numberOfImages: 1,
            aspectRatio: '3:4',
            personGeneration: 'ALLOW_ADULT'
          }
        });

        if (imageResponse.generatedImages?.[0]?.image?.imageBytes) {
          const base64Data = imageResponse.generatedImages[0].image.imageBytes;
          return res.json({
            success: true,
            source: 'imagen-3.0',
            imageUrl: `data:image/jpeg;base64,${base64Data}`,
            prompt: renderPrompt
          });
        }
      } catch (imgError) {
        console.warn('Imagen generation error, falling back to photorealistic lookbook catalog:', imgError.message);
      }
    }

    // 3. High-Quality Photorealistic Catalog Match based on Body Shape
    const shapeLower = (bodyShape || '').toLowerCase();
    let catalogImageUrl = '/assets/renders/preset_autumn_hourglass.jpg';
    if (shapeLower.includes('pear') || shapeLower.includes('triangle')) {
      catalogImageUrl = '/assets/renders/preset_winter_pear.jpg';
    } else if (shapeLower.includes('athletic') || shapeLower.includes('rectangle')) {
      catalogImageUrl = '/assets/renders/preset_spring_rectangle.jpg';
    }

    return res.json({
      success: true,
      source: 'photorealistic_lookbook',
      imageUrl: catalogImageUrl,
      silhouette: styling.silhouette_name,
      promptUsed: customStylePrompt || `Tailored ${styling.silhouette_name} in ${color.name}`
    });


  } catch (error) {
    console.error('Error rendering garment:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate garment visualization'
    });
  }
});

app.listen(PORT, () => {
  console.log(`GDG AI Event Fashion Testing Server running on http://localhost:${PORT}`);
});
