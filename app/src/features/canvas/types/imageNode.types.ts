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
  style: string;
  image: string;
  lighting: string;
  color: string;
  background: string;
  material: string;
  output: string;
  constraints: string;
}

export interface PresetItem {
  id: string;
  name: string;
  tabs: string[];
  category: 'realism' | 'mood' | 'environment' | 'perspective' | 'style' | 'atmosphere';
  group: string;
  selectType: 'single' | 'multi';
  presetType?: 'enhancement' | 'modifier';
  shortDescription: string;
  promptTemplate: string | PromptTemplate;
  shortHelp?: string;
  detailDescription?: string;
  keywords?: string[];
  recommendedInCommon?: boolean;
  userFavorite?: boolean;
  tags: string[];
  thumbnail: string;
}

export type PresetTab = '常用' | '变真实' | '换氛围' | '我的';

export type StylePreset = {
  id: string;
  type: 'style';
  title: string;
  description: string;
  thumbnail: string;
  heroImage?: string;
  sampleImages: string[];
  tags: string[];
  prompt: string;
  selectionMode: 'single';
  strength: 'high';
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
