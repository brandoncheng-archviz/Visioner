import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { purchaseTeamPlan, type PurchaseResult } from '@/services/accountApi';

interface TeamModalProps {
  open: boolean;
  onClose: () => void;
}

export default function TeamModal({ open, onClose }: TeamModalProps) {
  const [seats, setSeats] = useState(3);
  const [purchasing, setPurchasing] = useState(false);

  if (!open) return null;

  const handlePurchase = async () => {
    setPurchasing(true);
    const res: PurchaseResult = await purchaseTeamPlan(seats);
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
        className="relative z-10 rounded-2xl p-8 animate-in zoom-in-95 duration-200"
        style={{
          width: 640,
          maxWidth: '92vw',
          background: '#252530',
          border: '1px solid #2a2a35',
          boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-white">团队版</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-[#6a6a7a] transition-all hover:text-white hover:bg-white/5 hover:border-[#2a2a35] border border-transparent"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6 mt-5">
          {/* Team Plan Card */}
          <div
            className="rounded-xl p-6"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #2a2a35' }}
          >
            <span
              className="inline-block text-[10px] px-1.5 py-0.5 rounded-full font-semibold mb-2"
              style={{ background: 'rgba(0,212,255,0.12)', color: '#00d4ff' }}
            >
              45% Off
            </span>
            <h4 className="text-sm font-bold text-white mb-2">Team Plan</h4>
            <div className="text-2xl font-extrabold text-white mb-1">
              $109<span className="text-sm text-[#6a6a7a] line-through font-medium ml-1">$199</span>
              <span className="text-xs text-[#6a6a7a] font-medium">/席位/月</span>
            </div>
            <div className="text-[11px] text-[#6a6a7a] mb-4">
              年付立省 $1,080
              <br />
              按年计费, 首年 $1,308, 次年续费 $1,992
            </div>
            <button
              onClick={handlePurchase}
              disabled={purchasing}
              className="w-full py-2 rounded-lg text-[13px] font-semibold mb-4 transition-all hover:-translate-y-px"
              style={{ background: '#fff', color: '#0a0a0f' }}
            >
              {purchasing ? '处理中...' : '开通团队版'}
            </button>

            {/* Seat Control */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <button
                onClick={() => setSeats((s) => Math.max(1, s - 1))}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white transition-all hover:bg-white/10"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #2a2a35' }}
              >
                −
              </button>
              <span className="text-sm font-semibold text-white min-w-[60px] text-center">
                {seats} 席位
              </span>
              <button
                onClick={() => setSeats((s) => s + 1)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white transition-all hover:bg-white/10"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #2a2a35' }}
              >
                +
              </button>
            </div>

            <ul className="flex flex-col gap-2.5">
              {[
                '适用于小团队及工作室',
                '团队成员管理',
                '团队共享积分',
                '分配各个席位算力上限',
                '更多团队功能即将推出',
              ].map((text, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-[#a0a0b0]">
                  <Check className="w-3.5 h-3.5 text-[#00d4ff] mt-0.5 flex-shrink-0" />
                  {text}
                </li>
              ))}
            </ul>
          </div>

          {/* Enterprise Card */}
          <div
            className="rounded-xl p-6 flex flex-col justify-center items-center text-center"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #2a2a35' }}
          >
            <h4 className="text-lg font-bold text-white mb-2">10 人以上团队</h4>
            <div className="text-[28px] font-extrabold text-white mb-2">联系销售</div>
            <div className="text-[11px] text-[#6a6a7a] mb-5">联系销售获取报价</div>
            <button
              className="w-full py-2 rounded-lg text-[13px] font-semibold transition-all hover:-translate-y-px"
              style={{ background: '#fff', color: '#0a0a0f' }}
            >
              联系销售
            </button>
            <div className="mt-auto pt-6 w-full text-left">
              <div className="text-xs font-semibold text-[#a0a0b0] mb-3">包含团队版所有功能，以及：</div>
              <ul className="flex flex-col gap-2.5">
                {['优先技术支持', '自定义算力配额', '灵活的席位配置'].map((text, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[#a0a0b0]">
                    <Check className="w-3.5 h-3.5 text-[#00d4ff] mt-0.5 flex-shrink-0" />
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
