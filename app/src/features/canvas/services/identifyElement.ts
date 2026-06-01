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
  { label: '海水', type: 'seawater' },
  { label: '城市', type: 'city' },
  { label: '雾气', type: 'mist' },
];

const CUSTOM_LABELS = [
  '海水',
  '海面',
  '海浪',
  '海岸',
  '海岸线',
  '水景',
  '城市',
  '城市背景',
  '街道',
  '街景',
  '天际线',
  '雾气',
  '薄雾',
  '晨雾',
  '山雾',
  '空气感',
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

const CUSTOM_LABEL_TO_TYPE: Record<string, string> = {
  海水: 'seawater',
  海面: 'seawater',
  海浪: 'seawater',
  海岸: 'seawater',
  海岸线: 'seawater',
  城市: 'city',
  城市背景: 'city',
  街道: 'city',
  街景: 'city',
  天际线: 'city',
  雾气: 'mist',
  薄雾: 'mist',
  晨雾: 'mist',
  山雾: 'mist',
  空气感: 'mist',
};

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
  const mappedType = CUSTOM_LABEL_TO_TYPE[label];
  return {
    label,
    normalizedType: mappedType || 'custom',
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
