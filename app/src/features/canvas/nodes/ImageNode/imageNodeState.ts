export type ImageNodeVisualStatus = 'empty' | 'ready' | 'processing';

export type ImageNodeContentKind = 'none' | 'uploaded' | 'generated' | 'history' | 'external';

export type ImageNodeViewKind = 'empty' | 'resource' | 'editor' | 'processing';

export type ImageNodeTaskType = 'generate' | 'upscale' | 'relight' | 'prompt_reverse' | null;
