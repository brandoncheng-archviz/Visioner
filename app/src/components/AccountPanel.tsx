import { useState, useEffect } from 'react';
import { X, Zap, User, FileText, Pencil } from 'lucide-react';
import {
  fetchUserProfile,
  fetchCreditBalance,
  fetchPlanInfo,
  fetchUsageRecords,
  fetchBills,
  fetchDevices,
  removeDevice,
  removeAllDevices,
  type UserProfile,
  type CreditBalance,
  type PlanInfo,
  type UsageRecord,
  type BillRecord,
  type Device,
} from '@/services/accountApi';

interface AccountPanelProps {
  open: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  onRecharge: () => void;
}

type TabType = 'subscription' | 'profile' | 'billing';

export default function AccountPanel({ open, onClose, onUpgrade, onRecharge }: AccountPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('subscription');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [credits, setCredits] = useState<CreditBalance | null>(null);
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [usage, setUsage] = useState<UsageRecord[]>([]);
  const [bills, setBills] = useState<BillRecord[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      fetchUserProfile(),
      fetchCreditBalance(),
      fetchPlanInfo(),
      fetchUsageRecords(),
      fetchBills(),
      fetchDevices(),
    ]).then(([p, c, pl, u, b, d]) => {
      setProfile(p);
      setCredits(c);
      setPlan(pl);
      setUsage(u);
      setBills(b);
      setDevices(d);
      setLoading(false);
    });
  }, [open]);

  const handleRemoveDevice = async (deviceId: string) => {
    const res = await removeDevice(deviceId);
    if (res.success) {
      setDevices((prev) => prev.filter((d) => d.id !== deviceId));
    }
  };

  const handleRemoveAllDevices = async () => {
    const res = await removeAllDevices();
    if (res.success) {
      setDevices([]);
    }
  };

  if (!open) return null;

  const tabs = [
    { id: 'profile' as TabType, label: '个人主页', icon: User },
    { id: 'subscription' as TabType, label: '订阅', icon: Zap },
    { id: 'billing' as TabType, label: '账单', icon: FileText },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />
      <div
        className="relative z-10 flex rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        style={{
          width: 860,
          maxWidth: '92vw',
          height: 640,
          maxHeight: '90vh',
          background: '#252526',
          border: '1px solid #2a2a35',
          boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
        }}
      >
        {/* Left Sidebar */}
        <div
          className="w-[200px] flex-shrink-0 flex flex-col gap-1 p-3"
          style={{ background: '#1e1e1e', borderRight: '1px solid #2a2a35' }}
        >
          <div className="text-[11px] font-semibold text-[#6a6a7a] uppercase tracking-wider px-2 pb-3">
            账户管理
          </div>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] transition-all ${
                activeTab === tab.id
                  ? 'font-medium'
                  : 'text-[#a0a0b0] hover:bg-white/5 hover:text-white'
              }`}
              style={
                activeTab === tab.id
                  ? { background: 'rgba(0,212,255,0.1)', color: '#00d4ff' }
                  : {}
              }
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto px-8 py-7 relative">
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-7 h-7 rounded-md flex items-center justify-center text-[#e0e0e0] transition-all hover:text-white hover:bg-white/5 hover:border-[#2a2a35] border border-transparent"
            >
              <X className="w-4 h-4" />
            </button>

            {loading && (
              <div className="flex items-center justify-center h-full text-[#6a6a7a] text-sm">
                加载中...
              </div>
            )}

            {!loading && activeTab === 'subscription' && (
              <SubscriptionTab
                credits={credits}
                plan={plan}
                usage={usage}
                onUpgrade={onUpgrade}
                onRecharge={onRecharge}
              />
            )}

            {!loading && activeTab === 'profile' && (
              <ProfileTab profile={profile} devices={devices} onRemoveDevice={handleRemoveDevice} onRemoveAll={handleRemoveAllDevices} />
            )}

            {!loading && activeTab === 'billing' && <BillingTab bills={bills} />}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Subscription Tab ─── */

function SubscriptionTab({
  credits,
  plan,
  usage,
  onUpgrade,
  onRecharge,
}: {
  credits: CreditBalance | null;
  plan: PlanInfo | null;
  usage: UsageRecord[];
  onUpgrade: () => void;
  onRecharge: () => void;
}) {
  return (
    <div className="space-y-5">
      {/* Plan Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[22px] font-bold text-white">{plan?.currentPlan || 'Pro'}</span>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={onUpgrade}
            className="px-5 py-2 rounded-lg text-[13px] font-semibold transition-all hover:-translate-y-px"
            style={{ background: '#f0f0f0', color: '#0a0a0f' }}
          >
            升级
          </button>
          <button
            onClick={onRecharge}
            className="px-5 py-2 rounded-lg text-[13px] font-semibold border transition-all hover:-translate-y-px hover:border-[#3a3a4a]"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#fff', borderColor: '#2a2a35' }}
          >
            充值
          </button>
        </div>
      </div>

      {plan?.expiryDate && (
        <div className="text-xs text-[#6a6a7a]">
          {plan.status === 'cancelled' ? '订阅已取消，' : '订阅有效期至：'}
          {plan.expiryDate}
        </div>
      )}

      {/* Credit Balance */}
      <div className="flex items-baseline gap-2 mb-1">
        <Zap className="w-7 h-7 text-[#00d4ff]" fill="#00d4ff" />
        <span className="text-[32px] font-extrabold text-white tracking-tight">
          {credits?.total.toLocaleString() || '0'}
        </span>
      </div>

      {/* Credit Meta */}
      <div className="flex flex-col gap-1.5 text-xs text-[#6a6a7a] mb-5">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00d4ff]" />
          永久积分：{credits?.permanent || 0}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#6a6a7a]" />
          本日积分余额：{credits?.daily || 0}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" />
          本月积分余额：{credits?.monthly || 0}
          {credits?.monthlyExpiryDate && `（将于 ${credits.monthlyExpiryDate} 过期）`}
        </div>
        {credits?.bonuses.map((b, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="text-sm mr-0.5">🎁</span>
            {b.label}：有效期至 {b.expiryDate}
          </div>
        ))}
      </div>

      {/* Usage */}
      <div className="flex items-center justify-between text-[13px] font-semibold text-[#a0a0b0] mt-6 mb-3">
        <span>用量</span>
        <span className="text-[#00d4ff] font-medium">无限生成</span>
      </div>
      <div className="text-xs text-[#6a6a7a] mb-3">明细</div>

      {/* Table */}
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr style={{ borderBottom: '1px solid #2a2a35' }}>
            <th className="text-left py-2.5 px-3 text-[#6a6a7a] font-medium">明细</th>
            <th className="text-left py-2.5 px-3 text-[#6a6a7a] font-medium w-20">全部</th>
            <th className="text-left py-2.5 px-3 text-[#6a6a7a] font-medium w-[140px]">日期</th>
            <th className="text-right py-2.5 px-3 text-[#6a6a7a] font-medium w-20">积分消耗</th>
          </tr>
        </thead>
        <tbody>
          {usage.map((row) => (
            <tr
              key={row.id}
              className="transition-colors hover:bg-white/[0.02]"
              style={{ borderBottom: '1px solid #2a2a35' }}
            >
              <td className="py-3 px-3 text-[#a0a0b0] truncate max-w-[200px]">{row.detail}</td>
              <td className="py-3 px-3 text-[#a0a0b0]">{row.status}</td>
              <td className="py-3 px-3 text-[#6a6a7a] font-mono">{row.date}</td>
              <td
                className="py-3 px-3 text-right font-medium"
                style={{ color: row.points > 0 ? '#22c55e' : '#ef4444' }}
              >
                {row.points > 0 ? `+${row.points}` : row.points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Profile Tab ─── */

function ProfileTab({
  profile,
  devices,
  onRemoveDevice,
  onRemoveAll,
}: {
  profile: UserProfile | null;
  devices: Device[];
  onRemoveDevice: (id: string) => void;
  onRemoveAll: () => void;
}) {
  return (
    <div>
      <h3 className="text-lg font-bold text-white mb-6">账户信息</h3>

      <div className="flex items-center gap-4 mb-8">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #22d3ee)' }}
        >
          {profile?.avatarInitials || 'U'}
        </div>
        <div>
          <div className="text-lg font-bold text-white">{profile?.username || 'User'}</div>
          <div className="text-[13px] text-[#a0a0b0]">{profile?.email || ''}</div>
        </div>
        <button
          className="ml-auto px-4 py-2 rounded-lg text-[13px] font-semibold border transition-all hover:-translate-y-px hover:border-[#3a3a4a]"
          style={{ background: 'rgba(255,255,255,0.06)', color: '#fff', borderColor: '#2a2a35' }}
        >
          更换头像
        </button>
      </div>

      <div className="flex items-center justify-between py-3.5 border-b border-[#2a2a35] text-[13px]">
        <span className="text-[#a0a0b0]">用户名</span>
        <span className="text-white font-medium flex items-center gap-2">
          {profile?.username || 'User'}
          <Pencil className="w-3.5 h-3.5 text-[#e0e0e0] cursor-pointer hover:text-white transition-colors" />
        </span>
      </div>
      <div className="flex items-center justify-between py-3.5 border-b border-[#2a2a35] text-[13px]">
        <span className="text-[#a0a0b0]">电子邮箱</span>
        <span className="text-white font-medium">{profile?.email || ''}</span>
      </div>

      {/* Devices */}
      <div className="mt-8">
        <h4 className="text-sm font-bold text-white mb-3">设备管理</h4>
        <div className="text-xs text-[#6a6a7a] mb-4 leading-relaxed">
          Visioner 账户仅限个人使用。为防止盗用并确保平台稳定，任务最多可同时在 2 个桌面 Web 会话和 1 个移动 Web 会话中运行。如需团队多人使用，请购买 Team Plan。
          <button
            onClick={onRemoveAll}
            className="ml-2 text-[#ef4444] hover:bg-[rgba(239,68,68,0.1)] px-2 py-1 rounded transition-colors"
          >
            移除全部设备
          </button>
        </div>

        {devices.map((device) => (
          <div
            key={device.id}
            className="flex items-center justify-between p-3 rounded-lg mb-2 text-xs"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #2a2a35' }}
          >
            <div className="text-[#a0a0b0]">
              {device.type} | {device.os} | {device.browser} | {device.client} | {device.ip}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0 ml-4">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: device.status === 'online' ? '#22c55e' : '#6a6a7a' }}
              />
              <span className="text-[#6a6a7a]">{device.status === 'online' ? '在线' : '离线'}</span>
              <button
                onClick={() => onRemoveDevice(device.id)}
                className="text-[#ef4444] hover:bg-[rgba(239,68,68,0.1)] px-2 py-1 rounded transition-colors"
              >
                移除设备
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Logout */}
      <div className="mt-8 pt-6 border-t border-[#2a2a35]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13px] font-semibold text-white mb-1">退出登录</div>
            <div className="text-xs text-[#6a6a7a]">当前登录账号：{profile?.username || 'User'}</div>
          </div>
          <button
            className="px-4 py-2 rounded-lg text-[13px] font-semibold border transition-all hover:-translate-y-px hover:border-[#3a3a4a]"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#fff', borderColor: '#2a2a35' }}
          >
            退出登录
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Billing Tab ─── */

function BillingTab({ bills }: { bills: BillRecord[] }) {
  return (
    <div>
      <h3 className="text-lg font-bold text-white mb-6">账单</h3>
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr style={{ borderBottom: '1px solid #2a2a35' }}>
            <th className="text-left py-2.5 px-3 text-[#6a6a7a] font-medium">日期</th>
            <th className="text-left py-2.5 px-3 text-[#6a6a7a] font-medium">类别</th>
            <th className="text-left py-2.5 px-3 text-[#6a6a7a] font-medium">金额</th>
            <th className="text-left py-2.5 px-3 text-[#6a6a7a] font-medium">状态</th>
            <th className="text-right py-2.5 px-3 text-[#6a6a7a] font-medium">发票</th>
          </tr>
        </thead>
        <tbody>
          {bills.map((row) => (
            <tr
              key={row.id}
              className="transition-colors hover:bg-white/[0.02]"
              style={{ borderBottom: '1px solid #2a2a35' }}
            >
              <td className="py-3 px-3 text-[#a0a0b0] font-mono">{row.date}</td>
              <td className="py-3 px-3 text-[#a0a0b0]">{row.category}</td>
              <td className="py-3 px-3 text-white">{row.amount}</td>
              <td className="py-3 px-3">
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                  style={
                    row.status === 'paid'
                      ? { background: 'rgba(34,197,94,0.1)', color: '#22c55e' }
                      : { background: 'rgba(255,255,255,0.06)', color: '#a0a0b0' }
                  }
                >
                  {row.status === 'paid' ? 'Paid' : row.status}
                </span>
              </td>
              <td className="py-3 px-3 text-right">
                {row.invoiceUrl && (
                  <button className="text-[#00d4ff] hover:underline">下载</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {bills.length === 0 && (
        <div className="text-center py-6 text-xs text-[#6a6a7a]">暂无更多数据</div>
      )}
    </div>
  );
}
