import dotenv from 'dotenv';

dotenv.config();

/**
 * AI Image Generation Service using Pollinations.ai (Free, No Key)
 * * Generates unique fish images based on tier with consistent style.
 * Returns Base64 string required by mintProcessor.
 */

// Style consistency prompts (applied to all tiers)
const BASE_STYLE = 'digital art, vibrant colors, fantasy game art style, clean background, centered composition, high detail, 8k resolution, unreal engine 5 render';

/**
 * Tier-specific prompts
 */
const TIER_PROMPTS = {
  Junk: 'small old boot or trash item underwater, dull colors, uninteresting, algae covered',
  Common: 'common small fish, simple design, basic colors (silver, grey, brown), realistic scales',
  Rare: 'beautiful medium-sized fish, unique patterns, vibrant blue and orange colors, elegant fins, shimmering scales',
  Epic: 'large exotic fish, dramatic appearance, glowing bioluminescent markings, electric purple and gold colors, majestic flowing fins',
  Legendary: 'mythical enormous deep-sea fish, otherworldly design, radiant glowing aura, cosmic colors (deep blue, violet, golden), crystalline scales, ethereal energy effects, ancient and powerful appearance'
};

/**
 * Generate fish image based on tier
 * @param {string} tier - Fish tier (Junk, Common, Rare, Epic, Legendary)
 * @param {string} zone - Zone where caught (for additional context)
 * @param {number} seed - Random seed for variation
 * @returns {Promise<string>} Base64 encoded image
 */
export async function generateFishImage(tier, zone, seed) {
  try {
    console.log(`🎨 Generating ${tier} fish image (zone: ${zone}, seed: ${seed})...`);

    // 1. Build the prompt
    const tierPrompt = TIER_PROMPTS[tier] || TIER_PROMPTS.Common;
    const zoneContext = getZoneContext(zone);
    const fullPrompt = `${tierPrompt}, ${zoneContext}, ${BASE_STYLE}`;
    
    // 2. Encode prompt for URL
    const encodedPrompt = encodeURIComponent(fullPrompt);

    // 3. Construct Pollinations URL
    // We pass the seed to ensure deterministic results if retried
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&seed=${seed}&nologo=true`;

    console.log(`🔗 Calling URL: ${url}`);

    // 4. Fetch the image (Node.js 18+ has native fetch)
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Pollinations API error: ${response.statusText}`);
    }

    // 5. Convert Binary -> Buffer -> Base64
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');

    console.log(`✅ Image generated successfully (Size: ${base64Image.length} chars)`);

    return base64Image;

  } catch (error) {
    console.error(`❌ Image generation failed for ${tier}:`, error.message);
    throw new Error(`Failed to generate image: ${error.message}`);
  }
}

/**
 * Get zone-specific context for prompts
 */
function getZoneContext(zone) {
  const contexts = {
    Shallow: 'shallow clear water, sunlight filtering through, sandy bottom',
    Reef: 'coral reef environment, colorful underwater scenery, tropical setting',
    DeepSea: 'deep ocean, dark blue water, mysterious depths, subtle lighting',
    Abyssal: 'pitch black abyss, bioluminescent creatures, extreme depths, otherworldly environment'
  };
  return contexts[zone] || contexts.Shallow;
}

/**
 * Validate API configuration
 * (No API key needed for Pollinations, just logging success)
 */
export function validateConfig() {
  console.log('✅ Pollinations.ai configured (No API Key required)');
}

export default {
  generateFishImage,
  validateConfig
};