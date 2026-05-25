import type { Building2 } from 'lucide-react';

export type ImageRole =
  | 'primary_building'
  | 'atmosphere_reference'
  | 'vegetation_reference'
  | 'people_reference'
  | 'sky_reference'
  | 'custom_reference'
  | 'undefined_usage'
  | 'material_reference'
  | 'lighting_reference'
  | 'overall_reference'
  | 'plant_reference';

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

export type PresetTab = '我的常用' | '变真实' | '变时段' | '变天气' | '变季节';

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

export interface ReferenceInfo {
  nodeId: string;
  index: number;
  role: ImageRole | null;
  roleLabel: string;
  customRoleLabel?: string;
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
