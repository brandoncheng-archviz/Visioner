/**
 * Content safety check utilities — unified interface for text / image / generation
 * safety filtering.
 *
 * TODO: 上线前接入真实后端内容安全审核。
 * 当前开发阶段只保留统一入口，避免后续接入时大改生成流程。
 */

export type ContentSafetyLevel = "safe" | "warning" | "rewrite" | "blocked";

export type ContentSafetyCategory =
  | "sexual"
  | "violence"
  | "self_harm"
  | "hate"
  | "harassment"
  | "illegal"
  | "privacy"
  | "copyright"
  | "public_figure"
  | "child_safety"
  | "terror"
  | "other";

export interface ContentSafetyResult {
  allowed: boolean;
  level: ContentSafetyLevel;
  categories: ContentSafetyCategory[];
  message?: string;
  rewrittenPrompt?: string;
  provider: "mock";
  reviewedAt: number;
}

function createSafeResult(): ContentSafetyResult {
  return {
    allowed: true,
    level: "safe",
    categories: [],
    provider: "mock",
    reviewedAt: Date.now(),
  };
}

export function isContentSafetyAllowed(result: ContentSafetyResult): boolean {
  return result.allowed && result.level !== "blocked";
}

/**
 * Check text content (prompt, user input, etc.) for safety issues.
 * Current mock: always returns safe.
 */
export async function checkTextContentSafety(_input: string): Promise<ContentSafetyResult> {
  return createSafeResult();
}

/**
 * Check a single image (reference image, upload, etc.) for safety issues.
 * Current mock: always returns safe.
 */
export async function checkImageContentSafety(_image: {
  id?: string;
  url?: string;
  file?: File;
  usage?: string;
  label?: string;
}): Promise<ContentSafetyResult> {
  return createSafeResult();
}

/**
 * Check a generation request (prompt + reference images) before sending to the model.
 * Current mock: always returns safe.
 */
export async function checkGenerationRequestSafety(_params: {
  prompt: string;
  referenceImages?: Array<{
    id: string;
    url?: string;
    usage?: string;
    label?: string;
  }>;
}): Promise<ContentSafetyResult> {
  return createSafeResult();
}

/**
 * Check a generated result image before displaying it to the user.
 * Current mock: always returns safe.
 */
export async function checkGenerationResultSafety(_params: {
  imageUrl: string;
}): Promise<ContentSafetyResult> {
  return createSafeResult();
}
