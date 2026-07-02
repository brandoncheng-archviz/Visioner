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
  box: {
    normalizedX: number;
    normalizedY: number;
    normalizedWidth: number;
    normalizedHeight: number;
  };
  candidates: Array<{
    id: string;
    label: string;
    type: string;
    level: 'category' | 'object' | 'part';
    confidence?: number;
    promptText: string;
  }>;
  selectedCandidateId: string;
}

const CANDIDATE_GROUPS: IdentifyElementResult['candidates'][] = [
  [
    { id: 'sky-category', label: '天空', type: 'sky', level: 'category', confidence: 0.78, promptText: '重点参考标记框选区域内的天空色彩、明暗过渡和整体氛围。' },
    { id: 'sky-clouds', label: '云层', type: 'clouds', level: 'object', confidence: 0.86, promptText: '重点参考标记框选区域内的云层形态、层次、密度和光影关系。' },
    { id: 'sky-sunset', label: '晚霞天空', type: 'sunset_sky', level: 'part', confidence: 0.92, promptText: '重点参考标记框选区域内的晚霞色彩、云层边缘、渐变层次和真实感。' },
  ],
  [
    { id: 'plant-category', label: '植物', type: 'vegetation', level: 'category', confidence: 0.8, promptText: '重点参考标记框选区域内的植物类型、体量和绿化氛围。' },
    { id: 'plant-palm', label: '棕榈树', type: 'palm_tree', level: 'object', confidence: 0.88, promptText: '重点参考标记框选区域内的棕榈树形态、树冠比例和生长姿态。' },
    { id: 'plant-palm-leaf', label: '棕榈树的叶子', type: 'palm_leaf', level: 'part', confidence: 0.94, promptText: '重点参考标记框选区域内的叶片形态、层次、边缘细节和真实感。' },
  ],
  [
    { id: 'facade-category', label: '建筑立面', type: 'facade', level: 'category', confidence: 0.77, promptText: '重点参考标记框选区域内的建筑立面比例、构件关系和整体语言。' },
    { id: 'facade-glass', label: '玻璃幕墙', type: 'glass_curtain_wall', level: 'object', confidence: 0.87, promptText: '重点参考标记框选区域内的玻璃幕墙分格、通透度和材质表现。' },
    { id: 'facade-reflection', label: '玻璃反射', type: 'glass_reflection', level: 'part', confidence: 0.93, promptText: '重点参考标记框选区域内的玻璃反射强度、环境映射和细节真实感。' },
  ],
  [
    { id: 'light-category', label: '灯光', type: 'lighting', level: 'category', confidence: 0.76, promptText: '重点参考标记框选区域内的灯光色调、亮度和明暗关系。' },
    { id: 'light-interior', label: '室内灯光', type: 'interior_lighting', level: 'object', confidence: 0.85, promptText: '重点参考标记框选区域内的室内灯光层次、照明方式和空间氛围。' },
    { id: 'light-commercial', label: '商业暖光', type: 'commercial_warm_light', level: 'part', confidence: 0.91, promptText: '重点参考标记框选区域内的商业暖光色温、亮度层次和温暖氛围。' },
  ],
  [
    { id: 'paving-category', label: '铺装', type: 'paving', level: 'category', confidence: 0.79, promptText: '重点参考标记框选区域内的铺装类型、尺度和整体关系。' },
    { id: 'paving-ground', label: '地面铺装', type: 'ground_paving', level: 'object', confidence: 0.87, promptText: '重点参考标记框选区域内的地面铺装纹理、拼接方式和尺度。' },
    { id: 'paving-stone', label: '石材铺装', type: 'stone_paving', level: 'part', confidence: 0.93, promptText: '重点参考标记框选区域内的石材纹理、接缝、表面质感和真实细节。' },
  ],
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
  const candidates = CANDIDATE_GROUPS[seed % CANDIDATE_GROUPS.length].map((candidate) => ({ ...candidate }));
  const selectedCandidate = [...candidates].sort((a, b) => {
    const rank = { category: 0, object: 1, part: 2 } as const;
    return rank[b.level] - rank[a.level];
  })[0];
  const boxWidth = 0.18 + (seed % 16) / 100;
  const boxHeight = 0.14 + (seed % 18) / 100;
  const boxX = Math.max(0, Math.min(1 - boxWidth, req.point.x - boxWidth / 2));
  const boxY = Math.max(0, Math.min(1 - boxHeight, req.point.y - boxHeight / 2));

  return {
    label: selectedCandidate.label,
    normalizedType: selectedCandidate.type,
    confidence: selectedCandidate.confidence,
    reason: 'mock result',
    box: {
      normalizedX: boxX,
      normalizedY: boxY,
      normalizedWidth: boxWidth,
      normalizedHeight: boxHeight,
    },
    candidates,
    selectedCandidateId: selectedCandidate.id,
  };
}

/**
 * Reserved backend interface shape (not wired yet).
 *
 * POST /api/image/identify-element
 * Body: IdentifyElementRequest
 * Response: IdentifyElementResult
 */
