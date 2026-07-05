import type { Building2 } from 'lucide-react';

export type ImageRole =
  | 'primary_building'
  | 'atmosphere_reference'
  | 'material_reference'
  | 'landscape_reference'
  | 'lighting_reference'
  | 'interior_reference'
  | 'undefined_usage'
  // Legacy roles kept for persisted data compatibility
  | 'local_reference'
  | 'custom_reference'
  | 'overall_reference'
  // Legacy roles (read-only compatibility, mapped to local_reference)
  | 'vegetation_reference'
  | 'people_reference'
  | 'sky_reference'
  | 'plant_reference';

export type LocalReferenceType =
  | 'vegetation'
  | 'people'
  | 'sky'
  | 'seawater'
  | 'city'
  | 'glass'
  | 'mist'
  | 'paving'
  | 'custom'
  // Legacy values (read-only compatibility)
  | 'water'
  | 'retail';

export type LocalReferencePoint =
  | {
      normalizedX: number;
      normalizedY: number;
      imageX?: number;
      imageY?: number;
      displayX?: number;
      displayY?: number;
      x?: number;
      y?: number;
    }
  | {
      /** Legacy normalized coordinates. */
      x: number;
      y: number;
      normalizedX?: number;
      normalizedY?: number;
      imageX?: number;
      imageY?: number;
      displayX?: number;
      displayY?: number;
    };

export type ImageMarkLevel = 'category' | 'object' | 'part';

export interface ImageMarkCandidate {
  id: string;
  label: string;
  type: string;
  level: ImageMarkLevel;
  confidence?: number;
  promptText: string;
}

export interface ImageMarkPoint {
  normalizedX: number;
  normalizedY: number;
  imageX?: number;
  imageY?: number;
}

export interface ImageMarkBox {
  normalizedX: number;
  normalizedY: number;
  normalizedWidth: number;
  normalizedHeight: number;
}

export interface ImageMark {
  id: string;
  sourceNodeId: string;
  sourceImageUrl: string;
  usageKey: ImageRole | 'undefined_usage';
  usageLabel: string;
  markType: 'box';
  point: ImageMarkPoint;
  box: ImageMarkBox;
  candidates: ImageMarkCandidate[];
  selectedCandidateId: string;
  createdAt: number;
}

export interface ImageReferenceEdgeData {
  role?: ImageRole | null;
  customRoleLabel?: string;
  localReferenceType?: LocalReferenceType;
  localReferenceLabel?: string;
  localReferencePoint?: LocalReferencePoint;
}

export interface PromptTemplate {
  goal: string;
  style?: string;
  image?: string;
  atmosphere?: string;
  sky?: string;
  lighting?: string;
  color?: string;
  background?: string;
  environment?: string;
  vegetation?: string;
  material?: string;
  materialImpact?: string;
  output: string;
  constraints: string;
}

export interface PresetItem {
  id: string;
  name: string;
  title?: string;
  tabs: string[];
  category: 'realism' | 'mood' | 'environment' | 'perspective' | 'style' | 'atmosphere' | 'mine';
  group: string;
  selectType: 'single' | 'multi';
  selectionMode?: 'single' | 'multi';
  exclusiveGroup?: string;
  owner?: 'system' | 'user';
  presetType?: 'enhancement' | 'modifier';
  shortDescription: string;
  description?: string;
  promptTemplate: string | PromptTemplate;
  shortHelp?: string;
  detailDescription?: string;
  keywords?: string[];
  recommendedInCommon?: boolean;
  userFavorite?: boolean;
  tags: string[];
  thumbnail?: string;
  sourcePresetThumbnail?: string;
}

export type StylePromptTemplate = {
  styleCore: string;
  color: string;
  lighting: string;
  atmosphere: string;
  architectureEnvironment: string;
  composition: string;
  material: string;
  entourage: string;
  avoid: string;
};

export type StyleDefinition = {
  id: string;
  title: string;
  shortDescription: string;
  coverImage: string;
  detailedDescription: string;
  tags: string[];
  promptTemplate: StylePromptTemplate;
};

export type PromptContent =
  | { type: 'text'; text: string }
  | {
      type: 'image_reference';
      id: string;
      imageId: string;
      sourceNodeId: string;
      usage: string;
      thumbnailUrl: string;
      promptText: string;
      /** True only after the user actually changes the reference description. */
      promptTextEdited?: boolean;
    }
  | {
      type: 'image_mark_reference';
      id: string;
      markId: string;
      imageId: string;
      sourceNodeId: string;
      usageKey: ImageRole | 'undefined_usage';
      usageLabel: string;
      thumbnailUrl: string;
      markType: 'box';
      markPoint: ImageMarkPoint;
      markBox: ImageMarkBox;
      candidates: ImageMarkCandidate[];
      selectedCandidateId: string;
      markLabel: string;
      promptText: string;
      promptTextEdited?: boolean;
    }
  | {
      type: 'preset';
      id: string;
      title: string;
      promptText: string;
    }
  | {
      type: 'style';
      id: string;
      title: string;
      promptText: string;
    };

export type ImageReferencePromptBlock = Extract<PromptContent, { type: 'image_reference' }>;
export type ImageMarkReferencePromptBlock = Extract<PromptContent, { type: 'image_mark_reference' }>;

export interface ReferenceInfo {
  nodeId: string;
  index: number;
  role: ImageRole | null;
  roleLabel: string;
  customRoleLabel?: string;
  localReferenceType?: LocalReferenceType;
  localReferenceLabel?: string;
  localReferencePoint?: LocalReferencePoint;
  imageUrl: string;
  width?: number;
  height?: number;
}

export interface ImageRoleOption {
  value: ImageRole;
  label: string;
  description: string;
  detail: string;
  constraints: string[];
  Icon: typeof Building2;
  color: string;
}
