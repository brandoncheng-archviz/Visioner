import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
    { id: 'profile' as TabType, label: t('account.tabs.profile'), icon: User },
    { id: 'subscription' as TabType, label: t('account.tabs.subscription'), icon: Zap },
    { id: 'billing' as TabType, label: t('account.tabs.billing'), icon: FileText },
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
            {t('account.accountManagement')}
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
                {t('common.loading')}
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
  const { t } = useTranslation();
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
            {t('common.upgrade')}
          </button>
          <button
            onClick={onRecharge}
            className="px-5 py-2 rounded-lg text-[13px] font-semibold border transition-all hover:-translate-y-px hover:border-[#3a3a4a]"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#fff', borderColor: '#2a2a35' }}
          >
            {t('common.recharge')}
          </button>
        </div>
      </div>

      {plan?.expiryDate && (
        <div className="text-xs text-[#6a6a7a]">
          {plan.status === 'cancelled' ? t('account.plan.cancelled') : t('account.plan.validUntil')}
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
          {t('account.credits.permanent', { count: credits?.permanent || 0 })}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#6a6a7a]" />
          {t('account.credits.daily', { count: credits?.daily || 0 })}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" />
          {t('account.credits.monthly', { count: credits?.monthly || 0 })}
          {credits?.monthlyExpiryDate && t('account.credits.expiresOn', { date: credits.monthlyExpiryDate })}
        </div>
        {credits?.bonuses.map((b, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="text-sm mr-0.5">🎁</span>
            {t('account.credits.bonusExpires', { label: b.label, date: b.expiryDate })}
          </div>
        ))}
      </div>

      {/* Usage */}
      <div className="flex items-center justify-between text-[13px] font-semibold text-[#a0a0b0] mt-6 mb-3">
        <span>{t('account.usage.title')}</span>
        <span className="text-[#00d4ff] font-medium">{t('navbar.unlimited')}</span>
      </div>
      <div className="text-xs text-[#6a6a7a] mb-3">{t('account.usage.detail')}</div>

      {/* Table */}
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr style={{ borderBottom: '1px solid #2a2a35' }}>
            <th className="text-left py-2.5 px-3 text-[#6a6a7a] font-medium">{t('account.table.detail')}</th>
            <th className="text-left py-2.5 px-3 text-[#6a6a7a] font-medium w-20">{t('account.table.status')}</th>
            <th className="text-left py-2.5 px-3 text-[#6a6a7a] font-medium w-[140px]">{t('account.table.date')}</th>
            <th className="text-right py-2.5 px-3 text-[#6a6a7a] font-medium w-20">{t('account.table.pointsConsumed')}</th>
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
  const { t } = useTranslation();
  return (
    <div>
      <h3 className="text-lg font-bold text-white mb-6">{t('account.profile.title')}</h3>

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
          {t('account.profile.changeAvatar')}
        </button>
      </div>

      <div className="flex items-center justify-between py-3.5 border-b border-[#2a2a35] text-[13px]">
        <span className="text-[#a0a0b0]">{t('account.profile.username')}</span>
        <span className="text-white font-medium flex items-center gap-2">
          {profile?.username || 'User'}
          <Pencil className="w-3.5 h-3.5 text-[#e0e0e0] cursor-pointer hover:text-white transition-colors" />
        </span>
      </div>
      <div className="flex items-center justify-between py-3.5 border-b border-[#2a2a35] text-[13px]">
        <span className="text-[#a0a0b0]">{t('account.profile.email')}</span>
        <span className="text-white font-medium">{profile?.email || ''}</span>
      </div>

      {/* Devices */}
      <div className="mt-8">
        <h4 className="text-sm font-bold text-white mb-3">{t('account.devices.title')}</h4>
        <div className="text-xs text-[#6a6a7a] mb-4 leading-relaxed">
          {t('account.devices.description')}
          <button
            onClick={onRemoveAll}
            className="ml-2 text-[#ef4444] hover:bg-[rgba(239,68,68,0.1)] px-2 py-1 rounded transition-colors"
          >
            {t('account.devices.removeAll')}
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
              <span className="text-[#6a6a7a]">{device.status === 'online' ? t('account.devices.online') : t('account.devices.offline')}</span>
              <button
                onClick={() => onRemoveDevice(device.id)}
                className="text-[#ef4444] hover:bg-[rgba(239,68,68,0.1)] px-2 py-1 rounded transition-colors"
              >
                {t('account.devices.remove')}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Logout */}
      <div className="mt-8 pt-6 border-t border-[#2a2a35]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13px] font-semibold text-white mb-1">{t('account.logout.title')}</div>
            <div className="text-xs text-[#6a6a7a]">{t('account.logout.currentAccount', { username: profile?.username || 'User' })}</div>
          </div>
          <button
            className="px-4 py-2 rounded-lg text-[13px] font-semibold border transition-all hover:-translate-y-px hover:border-[#3a3a4a]"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#fff', borderColor: '#2a2a35' }}
          >
            {t('common.logout')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Billing Tab ─── */

function BillingTab({ bills }: { bills: BillRecord[] }) {
  const { t } = useTranslation();
  return (
    <div>
      <h3 className="text-lg font-bold text-white mb-6">{t('account.billing.title')}</h3>
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr style={{ borderBottom: '1px solid #2a2a35' }}>
            <th className="text-left py-2.5 px-3 text-[#6a6a7a] font-medium">{t('account.billing.table.date')}</th>
            <th className="text-left py-2.5 px-3 text-[#6a6a7a] font-medium">{t('account.billing.table.category')}</th>
            <th className="text-left py-2.5 px-3 text-[#6a6a7a] font-medium">{t('account.billing.table.amount')}</th>
            <th className="text-left py-2.5 px-3 text-[#6a6a7a] font-medium">{t('account.billing.table.status')}</th>
            <th className="text-right py-2.5 px-3 text-[#6a6a7a] font-medium">{t('account.billing.table.invoice')}</th>
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
                  {row.status === 'paid' ? t('account.billing.paid') : row.status}
                </span>
              </td>
              <td className="py-3 px-3 text-right">
                {row.invoiceUrl && (
                  <button className="text-[#00d4ff] hover:underline">{t('account.billing.download')}</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {bills.length === 0 && (
        <div className="text-center py-6 text-xs text-[#6a6a7a]">{t('account.empty.noMoreData')}</div>
      )}
    </div>
  );
}
