import { useState } from 'react';
import { X, Zap } from 'lucide-react';
import { rechargeOptions, purchaseCredits, type PurchaseResult } from '@/services/accountApi';

interface RechargeModalProps {
  open: boolean;
  onClose: () => void;
  balance?: number;
}

export default function RechargeModal({ open, onClose, balance = 3974 }: RechargeModalProps) {
  const [selected, setSelected] = useState<number>(1000);
  const [customPoints, setCustomPoints] = useState('');
  const [purchasing, setPurchasing] = useState(false);

  if (!open) return null;

  const isCustom = selected === -1;

  const handlePurchase = async () => {
    const points = isCustom ? parseInt(customPoints || '0', 10) : selected;
    if (!points || points <= 0) return;
    setPurchasing(true);
    const res: PurchaseResult = await purchaseCredits(points, isCustom);
    setPurchasing(false);
    if (res.success && res.checkoutUrl) {
      window.open(res.checkoutUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />
      <div
        className="relative z-10 rounded-2xl p-6 animate-in zoom-in-95 duration-200"
        style={{
          width: 420,
          maxWidth: '90vw',
          background: '#252530',
          border: '1px solid #2a2a35',
          boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-bold text-white">购买一次性积分以继续</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-[#6a6a7a] transition-all hover:text-white hover:bg-white/5 hover:border-[#2a2a35] border border-transparent"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="text-xs text-[#6a6a7a] mb-5">您的余额：{balance.toLocaleString()} 积分</div>

        {/* Options */}
        <div className="space-y-2.5 mb-5">
          {rechargeOptions.map((opt) => (
            <button
              key={opt.points}
              onClick={() => setSelected(opt.points)}
              className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all ${
                selected === opt.points
                  ? 'border-[#00d4ff]'
                  : 'border-[#2a2a35] hover:border-[#3a3a4a]'
              }`}
              style={selected === opt.points ? { background: 'rgba(0,212,255,0.06)', boxShadow: '0 0 0 3px rgba(0,212,255,0.1)' } : { background: 'rgba(255,255,255,0.02)' }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-colors ${
                    selected === opt.points ? 'border-[#00d4ff]' : 'border-[#2a2a35]'
                  }`}
                >
                  {selected === opt.points && <div className="w-2.5 h-2.5 rounded-full bg-[#00d4ff]" />}
                </div>
                <div className="flex items-center gap-1.5 text-sm font-bold text-white">
                  <Zap className="w-3.5 h-3.5 text-[#00d4ff]" fill="#00d4ff" />
                  <span>{opt.points.toLocaleString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#6a6a7a] line-through font-medium">${opt.originalPrice.toFixed(2)}</span>
                <span className="text-sm font-bold text-white">${opt.price.toFixed(2)}</span>
              </div>
            </button>
          ))}

          {/* Custom */}
          <button
            onClick={() => setSelected(-1)}
            className={`w-full flex items-center gap-2.5 px-4 py-3.5 rounded-xl border transition-all ${
              isCustom
                ? 'border-[#00d4ff]'
                : 'border-[#2a2a35] hover:border-[#3a3a4a]'
            }`}
            style={isCustom ? { background: 'rgba(0,212,255,0.06)', boxShadow: '0 0 0 3px rgba(0,212,255,0.1)' } : { background: 'rgba(255,255,255,0.02)' }}
          >
            <div
              className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-colors ${
                isCustom ? 'border-[#00d4ff]' : 'border-[#2a2a35]'
              }`}
            >
              {isCustom && <div className="w-2.5 h-2.5 rounded-full bg-[#00d4ff]" />}
            </div>
            <span className="text-sm font-bold text-white">自定义积分</span>
          </button>
          {isCustom && (
            <input
              type="number"
              value={customPoints}
              onChange={(e) => setCustomPoints(e.target.value)}
              placeholder="输入积分数量"
              className="w-full px-4 py-2.5 rounded-xl border text-sm text-white focus:outline-none placeholder:text-[#6a6a7a]"
              style={{ background: '#0a0a0f', borderColor: '#2a2a35' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#00d4ff')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2a35')}
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-[13px] text-[#a0a0b0] border transition-all hover:-translate-y-px hover:text-white hover:border-[#3a3a4a]"
            style={{ borderColor: '#2a2a35' }}
          >
            取消
          </button>
          <button
            onClick={handlePurchase}
            disabled={purchasing || (isCustom && (!customPoints || parseInt(customPoints) <= 0))}
            className="px-5 py-2 rounded-lg text-[13px] font-semibold transition-all hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: '#fff', color: '#0a0a0f' }}
          >
            {purchasing ? '处理中...' : '购买'}
          </button>
        </div>
      </div>
    </div>
  );
}
