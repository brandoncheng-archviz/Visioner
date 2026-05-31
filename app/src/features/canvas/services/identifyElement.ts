/**
 * Image element identification service — frontend mock for local-reference point-picking.
 *
 * Security: no third-party AI API keys, no direct Gemini / OpenAI calls.
 * Real AI calls must go through the backend.
 */

export interface IdentifyElementRequest {
  imageUrl: string;
  point: {
    x: number;
    y: number;
  };
}

export interface IdentifyElementResult {
  label: string;
  normalizedType?: string;
  confidence?: number;
  reason?: string;
}

const FIXED_TYPES = [
  { label: '植物', type: 'vegetation' },
  { label: '人物', type: 'people' },
  { label: '天空', type: 'sky' },
  { label: '水体', type: 'water' },
  { label: '商铺', type: 'retail' },
  { label: '铺装', type: 'paving' },
];

const CUSTOM_LABELS = [
  '海水',
  '水景',
  '家具',
  '灯具',
  '栏杆',
  '雕塑',
  '招牌',
  '雪地小路',
  '楼梯',
  '幕墙',
  '入口雨棚',
];

/**
 * Mock implementation — returns a deterministic pseudo-random result
 * based on the click coordinates so the same point always returns the
 * same label (good for UX stability during testing).
 */
export async function identifyImageElement(
  req: IdentifyElementRequest,
): Promise<IdentifyElementResult> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 600 + Math.random() * 800));

  // Deterministic pseudo-random based on point coordinates
  const seed = Math.round((req.point.x * 1000 + req.point.y * 1000) % 1000);
  const isFixed = seed % 3 !== 0; // ~66% chance of fixed type

  if (isFixed) {
    const item = FIXED_TYPES[seed % FIXED_TYPES.length];
    return {
      label: item.label,
      normalizedType: item.type,
      confidence: 0.7 + (seed % 30) / 100,
      reason: 'mock result',
    };
  }

  const label = CUSTOM_LABELS[seed % CUSTOM_LABELS.length];
  return {
    label,
    normalizedType: 'custom',
    confidence: 0.6 + (seed % 25) / 100,
    reason: 'mock result',
  };
}

/**
 * Reserved backend interface shape (not wired yet).
 *
 * POST /api/image/identify-element
 * Body: IdentifyElementRequest
 * Response: IdentifyElementResult
 */
