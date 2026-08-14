export interface BannerItem {
  id: number;
  title: string;
  subtitle: string;
  tag?: string;
  date?: string;
  image: string;
  textPosition: 'left' | 'center';
}

export interface CanvasNodeType {
  id: string;
  type: 'text' | 'image' | 'video' | 'video-merge' | 'audio' | 'script' | 'upscale';
  label: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface ProjectItem {
  id: string;
  name: string;
  thumbnail?: string;
  date?: string;
  createdAt?: string;
  updatedAt?: string;
  isCreateNew?: boolean;
  canvasNodes?: CanvasNodeType[];
}

export interface GalleryItem {
  id: number;
  title: string;
  author: string;
  authorAvatar: string;
  cover: string;
  category: string;
}

export const banners: BannerItem[] = [
  {
    id: 1,
    title: 'SKETCH TO RENDER',
    subtitle: '草图一键渲染',
    tag: 'VizMaker Core',
    image: '/assets/examples/home/banner-workflow.jpg',
    textPosition: 'left',
  },
  {
    id: 2,
    title: 'WIREFRAME',
    subtitle: 'AI 智能填色',
    tag: 'Revit / SketchUp / 3ds Max',
    date: '实时渲染',
    image: '/assets/examples/home/banner-ai-video.jpg',
    textPosition: 'left',
  },
  {
    id: 3,
    title: 'PRESET LIBRARY',
    subtitle: '千种风格预设',
    tag: '室内 · 建筑 · 景观 · 产品',
    image: '/assets/examples/home/banner-features.jpg',
    textPosition: 'left',
  },
];

// ─── 项目独立画布数据（使用 LibTV 标准节点类型） ───

const villaProjectNodes: CanvasNodeType[] = [
  {
    id: '1',
    type: 'text',
    label: '设计描述',
    position: { x: 50, y: 100 },
    data: { text: '现代极简别墅，落地玻璃，混凝土与木材结合，傍晚暖光，周围有松树' },
  },
  {
    id: '2',
    type: 'image',
    label: '概念草图',
    position: { x: 50, y: 300 },
    data: { image: '/images/show-cover-1.jpg', prompt: '手绘概念透视草图，现代别墅' },
  },
  {
    id: '3',
    type: 'image',
    label: 'Revit 线框',
    position: { x: 300, y: 200 },
    data: { image: '/images/show-cover-1.jpg', prompt: '建筑结构白模，Revit 导出' },
  },
  {
    id: '4',
    type: 'image',
    label: 'AI 渲染图',
    position: { x: 550, y: 200 },
    data: { image: '/images/show-cover-5.jpg', prompt: '现代极简别墅渲染，2048x1440，现代极简预设' },
  },
  {
    id: '5',
    type: 'video',
    label: '漫游动画',
    position: { x: 850, y: 200 },
    data: { model: 'Visioner Render VIP', duration: '15s', fps: 30 },
  },
  {
    id: '6',
    type: 'script',
    label: '分镜脚本',
    position: { x: 850, y: 50 },
    data: { items: ['入口全景', '客厅透视', '庭院鸟瞰', '夜景表现'] },
  },
  {
    id: '7',
    type: 'audio',
    label: '环境音效',
    position: { x: 850, y: 380 },
    data: { duration: '00:15', type: '自然风 + 鸟鸣' },
  },
];

const interiorProjectNodes: CanvasNodeType[] = [
  {
    id: '1',
    type: 'text',
    label: '设计说明',
    position: { x: 50, y: 100 },
    data: { text: '高端商业大堂，大理石地面，艺术吊灯，双层挑高，暖色调灯光' },
  },
  {
    id: '2',
    type: 'image',
    label: '现场照片',
    position: { x: 50, y: 300 },
    data: { image: '/images/show-cover-2.jpg', prompt: '原始现场实景照片' },
  },
  {
    id: '3',
    type: 'image',
    label: '平面方案',
    position: { x: 300, y: 200 },
    data: { image: '/images/show-cover-2.jpg', prompt: '大堂平面布置图' },
  },
  {
    id: '4',
    type: 'image',
    label: '效果图',
    position: { x: 550, y: 200 },
    data: { image: '/images/show-cover-2.jpg', prompt: '商业大堂效果图，2560x1440，商业奢华预设' },
  },
  {
    id: '5',
    type: 'video',
    label: '大堂漫游',
    position: { x: 850, y: 200 },
    data: { model: 'Visioner Render VIP', duration: '12s', fps: 30 },
  },
  {
    id: '6',
    type: 'script',
    label: '设计流程',
    position: { x: 850, y: 50 },
    data: { items: ['平面布局', '材质选型', '灯光设计', '最终渲染'] },
  },
];

const landscapeProjectNodes: CanvasNodeType[] = [
  {
    id: '1',
    type: 'text',
    label: '景观描述',
    position: { x: 50, y: 100 },
    data: { text: '城市生态公园，蜿蜒步道，本土植被，人工湿地，木质观景平台' },
  },
  {
    id: '2',
    type: 'image',
    label: '鸟瞰草图',
    position: { x: 50, y: 300 },
    data: { image: '/images/show-cover-4.jpg', prompt: '城市公园鸟瞰概念草图' },
  },
  {
    id: '3',
    type: 'image',
    label: '总平面图',
    position: { x: 300, y: 200 },
    data: { image: '/images/show-cover-4.jpg', prompt: '景观总平面图，1:500' },
  },
  {
    id: '4',
    type: 'image',
    label: '鸟瞰效果图',
    position: { x: 550, y: 200 },
    data: { image: '/images/show-cover-4.jpg', prompt: '公园鸟瞰效果图，3840x2160，自然生态预设' },
  },
  {
    id: '5',
    type: 'video',
    label: '飞鸟漫游',
    position: { x: 850, y: 200 },
    data: { model: 'Visioner Render VIP', duration: '20s', fps: 30 },
  },
  {
    id: '6',
    type: 'audio',
    label: '自然音效',
    position: { x: 850, y: 380 },
    data: { duration: '00:20', type: '流水 + 鸟鸣' },
  },
];

// 空白画布（创建新项目时使用）
export const blankCanvasNodes: CanvasNodeType[] = [];

export const recentProjects: ProjectItem[] = [
  {
    id: 'new',
    name: '创建新的项目',
    isCreateNew: true,
  },
  {
    id: 'villa-01',
    name: '现代别墅外观表现',
    thumbnail: '/assets/examples/home/project-thumb.jpg',
    date: '2026/04/24',
    canvasNodes: villaProjectNodes,
  },
  {
    id: 'interior-01',
    name: '商业大堂室内方案',
    thumbnail: '/images/show-cover-2.jpg',
    date: '2026/04/20',
    canvasNodes: interiorProjectNodes,
  },
  {
    id: 'landscape-01',
    name: '城市公园景观规划',
    thumbnail: '/images/show-cover-4.jpg',
    date: '2026/04/15',
    canvasNodes: landscapeProjectNodes,
  },
  {
    id: 'museum-01',
    name: '文化展馆概念方案',
    thumbnail: '/images/show-cover-7.jpg',
    date: '2026/04/12',
    canvasNodes: [],
  },
  {
    id: 'office-01',
    name: '总部办公建筑研究',
    thumbnail: '/images/show-cover-6.jpg',
    date: '2026/04/08',
    canvasNodes: [],
  },
];

// 根据项目 ID 获取画布数据
export function getProjectCanvasData(projectId: string) {
  const project = recentProjects.find((p) => p.id === projectId);
  if (project?.canvasNodes) {
    return { nodes: project.canvasNodes };
  }
  return { nodes: blankCanvasNodes };
}

export const galleryCategories = [
  '全部',
  '住宅室内',
  '商业空间',
  '办公建筑',
  '文化建筑',
  '景观设计',
  '参数化设计',
  '产品设计',
  '手绘表现',
  '夜景表现',
  '设计工具箱',
];

export const galleryData: GalleryItem[] = [
  { id: 1, title: '极简白模住宅', author: '建筑师小林', authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=1', cover: '/images/show-cover-1.jpg', category: '住宅室内' },
  { id: 2, title: '商业大堂漫游', author: 'VisionStudio', authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=2', cover: '/images/show-cover-2.jpg', category: '商业空间' },
  { id: 3, title: '参数化表皮研究', author: '算法设计所', authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=3', cover: '/images/show-cover-3.jpg', category: '参数化设计' },
  { id: 4, title: '日式枯山水庭院', author: '景观营造师', authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=4', cover: '/images/show-cover-4.jpg', category: '景观设计' },
  { id: 5, title: '北欧风公寓内饰', author: '室内设计师阿May', authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=5', cover: '/images/show-cover-5.jpg', category: '住宅室内' },
  { id: 6, title: '玻璃幕墙办公楼', author: '都市建筑设计', authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=6', cover: '/images/show-cover-6.jpg', category: '办公建筑' },
  { id: 7, title: '博物馆中庭表现', author: '文化馆设计团队', authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=7', cover: '/images/show-cover-7.jpg', category: '文化建筑' },
  { id: 8, title: '手绘风格别墅', author: '手绘表现师', authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=8', cover: '/images/show-cover-8.jpg', category: '手绘表现' },
  { id: 9, title: '夜景商业综合体', author: '灯光设计师老周', authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=9', cover: '/images/show-cover-9.jpg', category: '夜景表现' },
  { id: 10, title: '现代家具产品', author: '产品设计师Lee', authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=10', cover: '/images/show-cover-10.jpg', category: '产品设计' },
  { id: 11, title: '法式古典客厅', author: '古典设计工作室', authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=11', cover: '/images/show-cover-11.jpg', category: '住宅室内' },
  { id: 12, title: '城市公园规划', author: '城市规划师', authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=12', cover: '/images/show-cover-12.jpg', category: '景观设计' },
  { id: 13, title: 'LOFT工业风办公', author: '空间改造社', authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=13', cover: '/images/show-cover-13.jpg', category: '办公建筑' },
  { id: 14, title: '剧院大厅渲染', author: '演艺建筑设计', authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=14', cover: '/images/show-cover-14.jpg', category: '文化建筑' },
  { id: 15, title: '曲线造型展馆', author: '参数化研究所', authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=15', cover: '/images/show-cover-15.jpg', category: '参数化设计' },
  { id: 16, title: '咖啡厅室内设计', author: '餐饮空间设计', authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=16', cover: '/images/show-cover-16.jpg', category: '商业空间' },
  { id: 17, title: '雪景北欧小屋', author: '极地建筑师', authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=17', cover: '/images/show-cover-17.jpg', category: '夜景表现' },
  { id: 18, title: '智能家居产品', author: '科技产品设计', authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=18', cover: '/images/show-cover-18.jpg', category: '产品设计' },
  { id: 19, title: '水彩风格表现', author: '艺术表现工作室', authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=19', cover: '/images/show-cover-19.jpg', category: '手绘表现' },
  { id: 20, title: '高层住宅立面', author: '住宅标准化设计', authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=20', cover: '/images/show-cover-20.jpg', category: '设计工具箱' },
];
