/* ─── Account API Service ───
 * Fetches user profile, credits, usage, billing, devices, and plans.
 * When a real backend is ready, update the BASE_URL below.
 * For now, mock data is returned after a short delay to simulate network.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const USE_MOCK = !BASE_URL;
const MOCK_DELAY = 400;

/* ─── Types ─── */

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatarInitials: string;
}

export interface CreditBalance {
  total: number;
  permanent: number;
  daily: number;
  monthly: number;
  monthlyExpiryDate: string;
  bonuses: { label: string; expiryDate: string }[];
}

export interface PlanInfo {
  currentPlan: string;
  status: 'active' | 'cancelled' | 'expired';
  expiryDate: string | null;
}

export interface UsageRecord {
  id: string;
  detail: string;
  status: string;
  date: string;
  points: number;
}

export interface BillRecord {
  id: string;
  date: string;
  category: string;
  amount: string;
  status: 'paid' | 'pending' | 'failed';
  invoiceUrl: string | null;
}

export interface Device {
  id: string;
  type: string;
  os: string;
  browser: string;
  client: string;
  ip: string;
  status: 'online' | 'offline';
}

export interface PricingPlan {
  id: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  discount: string;
  yearlyNote: string;
  buttonText: string;
  buttonDisabled: boolean;
  popular?: boolean;
  features: { text: string; cross?: boolean; highlight?: boolean; limitTag?: string }[];
}

export interface RechargeOption {
  points: number;
  price: number;
  originalPrice: number;
}

/* ─── Mock Data ─── */

const mockProfile: UserProfile = {
  id: 'u-001',
  username: 'Brandon',
  email: '270824844@qq.com',
  avatarInitials: 'Br',
};

const mockCredits: CreditBalance = {
  total: 3974,
  permanent: 570,
  daily: 0,
  monthly: 3404,
  monthlyExpiryDate: '2026-05-03',
  bonuses: [
    {
      label: 'GPT Image 2, 0积分快速生成 (Low 1k&2k/无参考图)',
      expiryDate: '2026-05-07',
    },
  ],
};

const mockPlan: PlanInfo = {
  currentPlan: 'Pro',
  status: 'cancelled',
  expiryDate: '2027-03-03',
};

const mockUsage: UsageRecord[] = [
  { id: '1', detail: '[@image#1: Image][@image#...', status: '已消耗', date: '2026-05-01 19:30', points: -42 },
  { id: '2', detail: '[@image#1: Image][@image#...', status: '已消耗', date: '2026-05-01 19:27', points: -42 },
  { id: '3', detail: '[@image#1: Image][@image#...', status: '已消耗', date: '2026-05-01 19:18', points: -42 },
  { id: '4', detail: '[@image#1: Image][@image#...', status: '已消耗', date: '2026-05-01 19:16', points: -42 },
  { id: '5', detail: '[@image#1: Image][@image#...', status: '已消耗', date: '2026-05-01 19:13', points: -48 },
  { id: '6', detail: 'Daily Login Bonus', status: '已获得', date: '2026-05-01 18:17', points: +100 },
  { id: '7', detail: '[@image#1: VizMaker_dbase#...', status: '已消耗', date: '2026-05-01 15:17', points: -42 },
];

const mockBills: BillRecord[] = [
  { id: 'b1', date: '2026-03-02 11:04:00', category: 'PRO', amount: '540 USD', status: 'paid', invoiceUrl: '#' },
  { id: 'b2', date: '2026-01-20 14:04:00', category: 'PRO', amount: '69 USD', status: 'paid', invoiceUrl: '#' },
];

const mockDevices: Device[] = [
  {
    id: 'd1',
    type: '桌面端',
    os: 'Windows 10/11',
    browser: 'Chrome 132',
    client: 'PC-WEB',
    ip: '103.138.72.219',
    status: 'online',
  },
  {
    id: 'd2',
    type: '桌面端',
    os: 'Windows 10/11',
    browser: 'Chrome 144',
    client: 'PC-WEB',
    ip: '103.167.134.21',
    status: 'offline',
  },
];

export const pricingPlans: PricingPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 19,
    yearlyPrice: 16,
    discount: '16% Off',
    yearlyNote: '按年计费, $192/年',
    buttonText: '当前会员等级高于此套餐',
    buttonDisabled: true,
    features: [
      { text: '每月 2,000 积分 用于快速生成' },
      { text: '每日获得 100 刷新积分', cross: true },
      { text: '2 个并发任务' },
      { text: '5 个品牌套件' },
      { text: 'Nano Banana Pro & 2 间图半价' },
      { text: '访问所有图片模型' },
      { text: '访问所有视频模型', cross: true },
      { text: '可商用', cross: true },
    ],
  },
  {
    id: 'basic',
    name: 'Basic',
    monthlyPrice: 32,
    yearlyPrice: 27,
    discount: '16% Off',
    yearlyNote: '按年计费, $324/年',
    buttonText: '当前会员等级高于此套餐',
    buttonDisabled: true,
    features: [
      { text: '每月 3,500 积分 用于快速生成' },
      { text: 'GPT-image 2: 7天0积分快速生成', highlight: true, limitTag: '限时' },
      { text: '每日获得 100 刷新积分' },
      { text: '4 个并发任务' },
      { text: '10 个品牌套件' },
      { text: 'Nano Banana Pro & 2 间图半价' },
      { text: '访问所有图片模型' },
      { text: '访问所有视频模型', cross: true },
      { text: '可商用', cross: true },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 90,
    yearlyPrice: 50,
    discount: '44% Off',
    yearlyNote: '按年计费, 首年 $600, 次年续费 $888',
    buttonText: '当前套餐',
    buttonDisabled: true,
    popular: true,
    features: [
      { text: '每月 11,000 积分 用于快速生成' },
      { text: 'GPT-image 2: 14天0积分快速生成', highlight: true, limitTag: '限时' },
      { text: '每日获得 100 刷新积分' },
      { text: '8 个并发任务' },
      { text: '30 个品牌套件' },
      { text: 'Nano Banana Pro & 2 间图半价' },
      { text: '访问所有图片模型' },
      { text: '访问所有视频模型' },
      { text: '可商用' },
      { text: '充值积分九折优惠' },
    ],
  },
  {
    id: 'ultimate',
    name: 'Ultimate',
    monthlyPrice: 199,
    yearlyPrice: 109,
    discount: '45% Off',
    yearlyNote: '按年计费, 首年 $1,308, 次年续费 $1,992',
    buttonText: '立即升级',
    buttonDisabled: false,
    features: [
      { text: '每月 27,000 积分 用于快速生成' },
      { text: 'GPT-image 2: 31天0积分快速生成', highlight: true, limitTag: '限时' },
      { text: '每日获得 100 刷新积分' },
      { text: '10 个并发任务' },
      { text: '100 个品牌套件' },
      { text: 'Nano Banana Pro & 2 间图半价' },
      { text: '访问所有图片模型' },
      { text: '访问所有视频模型' },
      { text: '可商用' },
      { text: '充值积分九折优惠' },
      { text: '无限低速生成（覆盖最广）' },
    ],
  },
];

export const rechargeOptions: RechargeOption[] = [
  { points: 1000, price: 9.0, originalPrice: 10.0 },
  { points: 2000, price: 18.0, originalPrice: 20.0 },
  { points: 3000, price: 27.0, originalPrice: 30.0 },
  { points: 5000, price: 45.0, originalPrice: 50.0 },
];

/* ─── Helpers ─── */

async function mock<T>(data: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), MOCK_DELAY));
}

async function apiGet<T>(path: string, fallback: T): Promise<T> {
  if (USE_MOCK) return mock(fallback);
  try {
    const res = await fetch(`${BASE_URL}${path}`, { credentials: 'include' });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

async function apiPost<T>(path: string, body: unknown, fallback: T): Promise<T> {
  if (USE_MOCK) return mock(fallback);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

/* ─── API Functions ─── */

export function fetchUserProfile(): Promise<UserProfile> {
  return apiGet('/api/user/profile', mockProfile);
}

export function fetchCreditBalance(): Promise<CreditBalance> {
  return apiGet('/api/user/credits', mockCredits);
}

export function fetchPlanInfo(): Promise<PlanInfo> {
  return apiGet('/api/user/plan', mockPlan);
}

export function fetchUsageRecords(): Promise<UsageRecord[]> {
  return apiGet('/api/user/usage', mockUsage);
}

export function fetchBills(): Promise<BillRecord[]> {
  return apiGet('/api/user/bills', mockBills);
}

export function fetchDevices(): Promise<Device[]> {
  return apiGet('/api/user/devices', mockDevices);
}

export function removeDevice(deviceId: string): Promise<{ success: boolean }> {
  return apiPost('/api/user/devices/remove', { deviceId }, { success: true });
}

export function removeAllDevices(): Promise<{ success: boolean }> {
  return apiPost('/api/user/devices/remove-all', {}, { success: true });
}

export interface PurchaseResult {
  success: boolean;
  orderId?: string;
  checkoutUrl?: string;
  message?: string;
}

export function purchasePlan(planId: string, billing: 'monthly' | 'yearly'): Promise<PurchaseResult> {
  return apiPost('/api/payments/subscribe', { planId, billing }, {
    success: true,
    orderId: `ord-${Date.now()}`,
    checkoutUrl: '#',
  });
}

export function purchaseCredits(points: number, custom?: boolean): Promise<PurchaseResult> {
  return apiPost('/api/payments/recharge', { points, custom }, {
    success: true,
    orderId: `ord-${Date.now()}`,
    checkoutUrl: '#',
  });
}

export function purchaseTeamPlan(seats: number): Promise<PurchaseResult> {
  return apiPost('/api/payments/team', { seats }, {
    success: true,
    orderId: `ord-${Date.now()}`,
    checkoutUrl: '#',
  });
}
