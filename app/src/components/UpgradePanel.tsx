import { useState, useEffect, useRef } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { pricingPlans, purchasePlan, type PricingPlan, type PurchaseResult } from '@/services/accountApi';

interface UpgradePanelProps {
  open: boolean;
  onClose: () => void;
  onRecharge: () => void;
  onTeam: () => void;
}

const faqs = [
  { q: '积分是如何使用的？', a: '积分用于快速生成模式。不同模型消耗不同数量的积分，具体请查看下方的模型积分消耗表。' },
  { q: '积分会过期吗？', a: '订阅赠送的积分按月刷新，未使用的订阅积分将在下个周期开始时过期。永久积分和充值积分不会过期。' },
  { q: '我可以购买额外的积分吗？', a: '可以，您可以随时通过充值按钮购买额外积分，购买的积分将永久有效。' },
  { q: '我的订阅会自动续费吗？', a: '是的，年付和月付订阅默认开启自动续费。您可以随时在账户管理中取消。' },
  { q: '365 无限生成活动是如何运作的？', a: '在活动期间，特定模型支持无限低速生成，不消耗积分配额。' },
  { q: '快速生成与无限低速生成如何运作？', a: '快速生成优先使用队列，消耗积分；无限低速生成在空闲算力上运行，可能需要更长的等待时间。' },
  { q: '一个账户可以在多少台设备上使用？', a: '个人版最多同时在 2 个桌面 Web 会话和 1 个移动 Web 会话中运行。' },
  { q: '我可以升级我的套餐吗？', a: '随时可以升级，升级后新权益立即生效，费用按剩余天数比例计算。' },
];

const comparisonData = [
  { section: '图片模型', rows: [
    { label: 'GPT Image 2 1K\n1积分/张, low, no ref image', free: '100 张', starter: '2,000 张', basic: '3,500 张', pro: '365 Unlimited', ultimate: '365 Unlimited', unlimitedPro: true, unlimitedUlt: true },
    { label: 'GPT Image 2 2K\n2积分/张, low, no ref image', free: '50 张', starter: '1,000 张', basic: '1,750 张', pro: '5,500 张', ultimate: '13,500 张' },
    { label: 'GPT Image 2 4K\n3积分/张, low, no ref image', free: '33 张', starter: '666 张', basic: '1,166 张', pro: '3,666 张', ultimate: '9,000 张' },
  ]},
  { section: '视频模型', rows: [
    { label: 'Seedance 2.0 480p\n40积分/5s', free: '×', starter: '50 个', basic: '87 个', pro: '275 个', ultimate: '675 个' },
    { label: 'Seedance 2.0 720p\n60积分/5s', free: '×', starter: '22 个', basic: '38 个', pro: '122 个', ultimate: '300 个' },
  ]},
  { section: '权限 & 功能', rows: [
    { label: '并发任务', free: '1', starter: '2', basic: '4', pro: '8', ultimate: '10' },
    { label: '商业许可', free: '×', starter: '×', basic: '✓', pro: '✓', ultimate: '✓' },
    { label: '所有视频模型', free: '×', starter: '×', basic: '×', pro: '✓', ultimate: '✓' },
  ]},
];

export default function UpgradePanel({ open, onClose, onRecharge, onTeam }: UpgradePanelProps) {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('yearly');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 12, m: 20, s: 8 });
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!open) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        let { d, h, m, s } = prev;
        s--;
        if (s < 0) { s = 59; m--; }
        if (m < 0) { m = 59; h--; }
        if (h < 0) { h = 23; d--; }
        if (d < 0) { d = 0; h = 0; m = 0; s = 0; }
        return { d, h, m, s };
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [open]);

  const handlePurchase = async (plan: PricingPlan) => {
    if (plan.buttonDisabled) return;
    setPurchasing(plan.id);
    const res: PurchaseResult = await purchasePlan(plan.id, billing);
    setPurchasing(null);
    if (res.success && res.checkoutUrl) {
      window.open(res.checkoutUrl, '_blank');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />
      <div
        className="relative z-10 rounded-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        style={{
          width: 960,
          maxWidth: '94vw',
          height: '86vh',
          maxHeight: 900,
          background: '#252526',
          border: '1px solid #2a2a35',
          boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a35] flex-shrink-0">
          <div />
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-[#e0e0e0] transition-all hover:text-white hover:bg-white/5 hover:border-[#2a2a35] border border-transparent"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-10 py-8">
          {/* Promo Banner */}
          <div
            className="relative w-full h-[120px] rounded-xl flex items-center justify-between px-8 mb-8 overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
              border: '1px solid rgba(99,102,241,0.2)',
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: 'radial-gradient(circle at 80% 50%, rgba(34,211,238,0.15), transparent 60%)',
              }}
            />
            <div className="relative z-[1]">
              <h3 className="text-base font-bold text-white mb-1.5">抢先体验新一代 GPT Image 2 模型</h3>
              <p className="text-[13px] text-[#a0a0b0]">升级最高立享 31 天 0 积分快速生成及 365 天无限创作。</p>
            </div>
            <div className="relative z-[1] flex gap-3">
              {[
                { val: timeLeft.d, unit: '天' },
                { val: timeLeft.h, unit: '时' },
                { val: timeLeft.m, unit: '分' },
                { val: timeLeft.s, unit: '秒' },
              ].map((item, i) => (
                <div key={i} className="text-center">
                  <div
                    className="w-12 h-12 leading-[48px] rounded-lg text-xl font-extrabold text-white text-center"
                    style={{
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {String(item.val).padStart(2, '0')}
                  </div>
                  <div className="text-[11px] text-[#6a6a7a] mt-1">{item.unit}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-6">
            <h2 className="text-[22px] font-bold text-white">升级您的套餐</h2>
          </div>

          {/* Billing Toggle */}
          <div className="flex justify-center mb-2">
            <div
              className="inline-flex items-center rounded-full p-1"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #2a2a35' }}
            >
              <button
                onClick={() => setBilling('monthly')}
                className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                  billing === 'monthly' ? 'text-white' : 'text-[#6a6a7a]'
                }`}
                style={billing === 'monthly' ? { background: 'rgba(255,255,255,0.1)' } : {}}
              >
                月付
              </button>
              <button
                onClick={() => setBilling('yearly')}
                className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all flex items-center ${
                  billing === 'yearly' ? 'text-white' : 'text-[#6a6a7a]'
                }`}
                style={billing === 'yearly' ? { background: 'rgba(255,255,255,0.1)' } : {}}
              >
                年付
                <span
                  className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                  style={{ background: 'rgba(0,212,255,0.12)', color: '#00d4ff' }}
                >
                  最高享 55 折
                </span>
              </button>
            </div>
          </div>

          {/* Team Link */}
          <div className="flex justify-end mb-6">
            <button
              onClick={onTeam}
              className="text-xs text-[#6a6a7a] px-3 py-1.5 rounded-md border transition-all hover:text-white hover:border-[#3a3a4a] hover:bg-white/[0.03]"
              style={{ borderColor: '#2a2a35' }}
            >
              团队版
            </button>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {pricingPlans.map((plan) => {
              const price = billing === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
              const orig = billing === 'monthly' ? plan.yearlyPrice : plan.monthlyPrice;
              return (
                <div
                  key={plan.id}
                  className="rounded-xl border p-5 flex flex-col relative transition-all hover:-translate-y-0.5"
                  style={{
                    background: plan.popular ? 'linear-gradient(180deg, rgba(0,212,255,0.06), rgba(0,212,255,0.02))' : 'rgba(255,255,255,0.03)',
                    borderColor: plan.popular ? 'rgba(0,212,255,0.3)' : '#2a2a35',
                    boxShadow: plan.popular ? '0 8px 32px rgba(0,212,255,0.08)' : 'none',
                  }}
                >
                  {plan.popular && (
                    <div
                      className="absolute -top-px left-1/2 -translate-x-1/2 px-3 py-1 text-[10px] font-bold text-white rounded-b-lg"
                      style={{ background: 'linear-gradient(90deg, #3b82f6, #22d3ee)' }}
                    >
                      最受欢迎
                    </div>
                  )}
                  <h4 className="text-sm font-semibold text-white mb-3 flex items-center justify-between">
                    {plan.name}
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{ background: 'rgba(0,212,255,0.12)', color: '#00d4ff' }}
                    >
                      {plan.discount}
                    </span>
                  </h4>
                  <div className="text-[28px] font-extrabold text-white mb-1">
                    ${price}
                    <span className="text-sm text-[#6a6a7a] line-through font-medium ml-1">${orig}</span>
                    <span className="text-[13px] text-[#6a6a7a] font-medium">/月</span>
                  </div>
                  <div className="text-[11px] text-[#6a6a7a] mb-4">{plan.yearlyNote}</div>
                  <button
                    onClick={() => handlePurchase(plan)}
                    disabled={plan.buttonDisabled || purchasing === plan.id}
                    className={`w-full py-2 rounded-lg text-[13px] font-semibold mb-4 transition-all ${
                      plan.buttonDisabled
                        ? 'cursor-not-allowed'
                        : 'hover:-translate-y-px'
                    }`}
                    style={
                      plan.buttonDisabled
                        ? { background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid #2a2a35' }
                        : { background: '#f0f0f0', color: '#0a0a0f' }
                    }
                  >
                    {purchasing === plan.id ? '处理中...' : plan.buttonText}
                  </button>
                  <ul className="flex flex-col gap-2.5 flex-1">
                    {plan.features.map((f, i) => (
                      <li
                        key={i}
                        className={`flex items-start gap-2 text-xs leading-relaxed ${
                          f.cross ? 'text-[#6a6a7a]' : f.highlight ? 'text-[#00d4ff] font-medium' : 'text-[#a0a0b0]'
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                          style={{
                            background: f.cross
                              ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236a6a7a' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cline x1='18' y1='6' x2='6' y2='18'/%3E%3Cline x1='6' y1='6' x2='18' y2='18'/%3E%3C/svg%3E") center/contain no-repeat`
                              : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2300d4ff' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'/%3E%3C/svg%3E") center/contain no-repeat`,
                          }}
                        />
                        <span className="flex-1">
                          {f.text}
                          {f.limitTag && (
                            <span
                              className="ml-2 text-[10px] px-1 py-px rounded font-semibold"
                              style={{ background: 'rgba(0,212,255,0.1)', color: '#00d4ff' }}
                            >
                              {f.limitTag}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* FAQ */}
          <div className="mb-6">
            <h3 className="text-base font-bold text-white text-center mb-4">常见问题</h3>
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="border-b border-[#2a2a35]"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between py-4 text-[13px] font-medium text-[#a0a0b0] hover:text-white transition-colors text-left"
                >
                  {faq.q}
                  <ChevronDown
                    className="w-4 h-4 transition-transform duration-300"
                    style={{ transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  />
                </button>
                <div
                  className="overflow-hidden transition-all duration-300 ease-out"
                  style={{
                    maxHeight: openFaq === i ? 200 : 0,
                    paddingBottom: openFaq === i ? 16 : 0,
                  }}
                >
                  <p className="text-xs text-[#6a6a7a] leading-relaxed">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Comparison Table */}
          <div className="mt-8">
            <h3 className="text-base font-bold text-white text-center mb-5">
              模型积分消耗 & 每月生成数量
            </h3>
            <p className="text-center text-xs text-[#6a6a7a] mb-5">
              以下为基于「生成器」模式的积分消耗和生成数量，Agent 模式的积分消耗略高于「生成器」模式
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr style={{ borderBottom: '1px solid #2a2a35' }}>
                    <th className="py-2.5 px-2 text-center text-[#6a6a7a] font-medium" />
                    <th className="py-2.5 px-2 text-center text-[#6a6a7a] font-medium">Free</th>
                    <th className="py-2.5 px-2 text-center text-[#6a6a7a] font-medium">Starter</th>
                    <th className="py-2.5 px-2 text-center text-[#6a6a7a] font-medium">Basic</th>
                    <th className="py-2.5 px-2 text-center text-[#6a6a7a] font-medium" style={{ background: 'rgba(0,212,255,0.04)' }}>Pro</th>
                    <th className="py-2.5 px-2 text-center text-[#6a6a7a] font-medium">Ultimate</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((section) => (
                    <>
                      <tr>
                        <td
                          colSpan={6}
                          className="py-2 px-2 text-[#a0a0b0] font-semibold text-xs"
                          style={{ background: 'rgba(255,255,255,0.03)' }}
                        >
                          {section.section}
                        </td>
                      </tr>
                      {section.rows.map((row, ri) => (
                        <tr key={ri} style={{ borderBottom: '1px solid #2a2a35' }}>
                          <td className="py-2.5 px-2 text-[#6a6a7a] whitespace-pre-line">
                            {row.label.split('\n')[0]}
                            {row.label.split('\n')[1] && (
                              <span className="block text-[11px] text-[#6a6a7a] mt-0.5">{row.label.split('\n')[1]}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-center text-[#a0a0b0]">{row.free}</td>
                          <td className="py-2.5 px-2 text-center text-[#a0a0b0]">{row.starter}</td>
                          <td className="py-2.5 px-2 text-center text-[#a0a0b0]">{row.basic}</td>
                          <td
                            className="py-2.5 px-2 text-center text-[#a0a0b0]"
                            style={{ background: 'rgba(0,212,255,0.04)' }}
                          >
                            {(row as { unlimitedPro?: boolean }).unlimitedPro ? (
                              <span className="text-[#00d4ff] font-semibold">365 Unlimited</span>
                            ) : row.pro}
                          </td>
                          <td className="py-2.5 px-2 text-center text-[#a0a0b0]">
                            {(row as { unlimitedUlt?: boolean }).unlimitedUlt ? (
                              <span className="text-[#00d4ff] font-semibold">365 Unlimited</span>
                            ) : row.ultimate}
                          </td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom recharge link */}
          <div className="text-center py-6">
            <button
              onClick={onRecharge}
              className="text-sm text-[#6a6a7a] hover:text-white transition-colors"
            >
              充值积分 →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
