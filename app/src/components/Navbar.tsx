import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Flame,
  Trophy,
  HelpCircle,
  Bell,
  ShoppingCart,
  Crown,
  User,
  LogOut,
  Settings,
  Users,
  Sparkles,
  X,
  Zap,
  Star,
  Globe,
  Keyboard,
  Mail,
} from 'lucide-react';
import AccountPanel from './AccountPanel';
import UpgradePanel from './UpgradePanel';
import RechargeModal from './RechargeModal';
import TeamModal from './TeamModal';
import { fetchCreditBalance, type CreditBalance } from '@/services/accountApi';

interface NavbarProps {
  variant?: 'home' | 'canvas';
  projectName?: string;
}

export default function Navbar({ variant = 'home', projectName = '' }: NavbarProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [credits, setCredits] = useState<CreditBalance | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);

  // Fetch real credit balance
  useEffect(() => {
    fetchCreditBalance().then(setCredits).catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) {
        setHelpOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isCanvas = variant === 'canvas';
  const balance = credits?.total ?? 4190;

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4 md:px-6 pointer-events-none"
      style={{
        background: 'transparent',
      }}
    >
      {/* Left */}
      <div className="flex items-center gap-4 pointer-events-auto">
        <button
          onClick={() => navigate('/')}
          className="text-white font-bold text-lg tracking-tight hover:opacity-80 transition-opacity"
        >
          Visioner
        </button>
        {isCanvas && (
          <>
            <span className="text-[#6a6a7a] text-sm">|</span>
            <button className="text-[#a0a0b0] text-sm hover:text-white transition-colors flex items-center gap-1">
              {projectName || t('common.unnamed')}
            </button>
          </>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 pointer-events-auto">
        {!isCanvas && (
          <>
            <button className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-[#a0a0b0] border border-[#2a2a35] hover:bg-[#1e1e28] hover:border-[#3a3a4a] transition-all">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              {t('navbar.competition')}
            </button>

            <button className="w-8 h-8 rounded-full flex items-center justify-center text-[#e0e0e0] hover:text-white hover:bg-[#1e1e28] transition-all">
              <Trophy className="w-4 h-4" />
            </button>

            <div className="relative" ref={helpRef}>
              <button
                onClick={() => setHelpOpen(!helpOpen)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#a0a0b0] hover:text-white hover:bg-[#1e1e28] transition-all"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
              {helpOpen && (
                <div
                  className="absolute right-0 top-10 w-44 py-2 rounded-xl animate-in fade-in slide-in-from-top-1 duration-150"
                  style={{
                    background: '#252526',
                    border: '1px solid #2a2a35',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  }}
                >
                  <button className="w-full px-3 py-2 text-left text-sm text-[#a0a0b0] hover:bg-[#1e1e28] hover:text-white transition-colors flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#e0e0e0]" />
                    {t('navbar.tutorial')}
                  </button>
                  <button className="w-full px-3 py-2 text-left text-sm text-[#a0a0b0] hover:bg-[#1e1e28] hover:text-white transition-colors flex items-center gap-2">
                    <Settings className="w-4 h-4 text-[#e0e0e0]" />
                    {t('navbar.filingInfo')}
                  </button>
                  <button className="w-full px-3 py-2 text-left text-sm text-[#a0a0b0] hover:bg-[#1e1e28] hover:text-white transition-colors flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-[#e0e0e0]" />
                    {t('navbar.contactSupport')}
                  </button>
                </div>
              )}
            </div>

            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative w-8 h-8 rounded-full flex items-center justify-center text-[#e0e0e0] hover:text-white hover:bg-[#1e1e28] transition-all"
              >
                <Bell className="w-4 h-4 text-[#e0e0e0]" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500" />
              </button>
              {notifOpen && (
                <div
                  className="absolute right-0 top-10 w-80 py-2 rounded-xl animate-in fade-in slide-in-from-top-1 duration-150"
                  style={{
                    background: '#252526',
                    border: '1px solid #2a2a35',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  }}
                >
                  <div className="flex items-center justify-between px-4 py-2 border-b border-[#2a2a35]">
                    <span className="text-sm font-medium text-white">{t('navbar.notifications')}</span>
                    <button onClick={() => setNotifOpen(false)} className="text-[#e0e0e0] hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="px-4 py-3">
                    <div className="text-xs text-[#a0a0b0] mb-1">2026-04-22 12:00:00</div>
                    <div className="text-sm text-white">{t('navbar.notification.item1')}</div>
                  </div>
                  <div className="px-4 py-3 border-t border-[#2a2a35]">
                    <div className="text-xs text-[#a0a0b0] mb-1">2026-04-23 11:14:47</div>
                    <div className="text-sm text-white">{t('navbar.notification.item2')}</div>
                  </div>
                  <div className="px-4 py-3 border-t border-[#2a2a35]">
                    <div className="text-xs text-[#a0a0b0] mb-1">2026-04-24 21:40:11</div>
                    <div className="text-sm text-white">{t('navbar.notification.item3')}</div>
                  </div>
                </div>
              )}
            </div>

            <button className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#00d4ff] text-[#0a0a0f] hover:brightness-110 transition-all">
              <ShoppingCart className="w-3.5 h-3.5" />
              {t('navbar.renderCenter')}
            </button>

            <button className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium text-[#0a0a0f]"
              style={{ background: 'linear-gradient(90deg, #f5a623, #e89613)' }}>
              <Crown className="w-3 h-3" />
              {t('navbar.limitedOffer')}
            </button>
          </>
        )}

        {isCanvas && (
          <button
            onClick={() => setAccountOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold text-white transition-all hover:bg-white/5 mr-2"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <Zap className="w-3.5 h-3.5 text-[#00d4ff]" fill="currentColor" />
            <span>{balance.toLocaleString()}</span>
          </button>
        )}

        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium hover:ring-2 hover:ring-[#00d4ff]/30 transition-all"
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #22d3ee)',
              border: '2px solid rgba(255,255,255,0.1)',
            }}
          >
            {credits ? 'Br' : 'U'}
          </button>
          {userMenuOpen && (
            <div
              className="absolute right-0 top-11 w-56 py-2 rounded-xl animate-in fade-in slide-in-from-top-1 duration-150"
              style={{
                background: '#252526',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
              }}
            >
              {/* Header */}
              <div className="px-3 pb-2 border-b border-[#2a2a35] mb-1.5">
                <div className="text-sm font-semibold text-white">Brandon</div>
                <div className="text-[11px] text-[#6a6a7a] mt-0.5">270824844@qq.com</div>
              </div>

              {/* Menu Items */}
              <button
                onClick={() => { setUserMenuOpen(false); setUpgradeOpen(true); }}
                className="w-full px-3 py-2 text-left text-[13px] text-[#a0a0b0] hover:bg-white/[0.06] hover:text-white transition-colors flex items-center gap-2.5 rounded-md mx-1 w-[calc(100%-8px)]"
              >
                <Star className="w-4 h-4 text-[#e0e0e0]" />
                {t('common.upgrade')}
              </button>
              <button className="w-full px-3 py-2 text-left text-[13px] text-[#a0a0b0] hover:bg-white/[0.06] hover:text-white transition-colors flex items-center gap-2.5 rounded-md mx-1 w-[calc(100%-8px)]">
                <Users className="w-4 h-4 text-[#e0e0e0]" />
                {t('navbar.createTeam')}
              </button>
              <button
                onClick={() => { setUserMenuOpen(false); setAccountOpen(true); }}
                className="w-full px-3 py-2 text-left text-[13px] text-[#a0a0b0] hover:bg-white/[0.06] hover:text-white transition-colors flex items-center gap-2.5 rounded-md mx-1 w-[calc(100%-8px)]"
              >
                <User className="w-4 h-4 text-[#e0e0e0]" />
                {t('common.accountManagement')}
              </button>

              <div className="border-t border-[#2a2a35] my-1.5 mx-3" />

              <button className="w-full px-3 py-2 text-left text-[13px] text-[#a0a0b0] hover:bg-white/[0.06] hover:text-white transition-colors flex items-center gap-2.5 rounded-md mx-1 w-[calc(100%-8px)]">
                <HelpCircle className="w-4 h-4 text-[#e0e0e0]" />
                {t('navbar.tutorial')}
              </button>
              <button className="w-full px-3 py-2 text-left text-[13px] text-[#a0a0b0] hover:bg-white/[0.06] hover:text-white transition-colors flex items-center gap-2.5 rounded-md mx-1 w-[calc(100%-8px)]">
                <Keyboard className="w-4 h-4 text-[#e0e0e0]" />
                {t('common.shortcuts')}
              </button>
              <button className="w-full px-3 py-2 text-left text-[13px] text-[#a0a0b0] hover:bg-white/[0.06] hover:text-white transition-colors flex items-center gap-2.5 rounded-md mx-1 w-[calc(100%-8px)]">
                <Mail className="w-4 h-4 text-[#e0e0e0]" />
                {t('common.contactUs')}
              </button>

              <div className="border-t border-[#2a2a35] my-1.5 mx-3" />

              <button
                onClick={() => i18n.changeLanguage(i18n.language === 'zh-CN' ? 'en-US' : 'zh-CN')}
                className="w-full px-3 py-2 text-left text-[13px] text-[#a0a0b0] hover:bg-white/[0.06] hover:text-white transition-colors flex items-center gap-2.5 rounded-md mx-1 w-[calc(100%-8px)]"
              >
                <Globe className="w-4 h-4 text-[#e0e0e0]" />
                {i18n.language === 'zh-CN' ? t('navbar.simplifiedChinese') : t('navbar.english')}
              </button>

              <div className="border-t border-[#2a2a35] my-1.5 mx-3" />

              <button className="w-full px-3 py-2 text-left text-[13px] text-[#a0a0b0] hover:bg-white/[0.06] hover:text-white transition-colors flex items-center gap-2.5 rounded-md mx-1 w-[calc(100%-8px)]">
                <LogOut className="w-4 h-4 text-[#e0e0e0]" />
                {t('common.logout')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Account Panel */}
      <AccountPanel
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        onUpgrade={() => {
          setAccountOpen(false);
          setUpgradeOpen(true);
        }}
        onRecharge={() => {
          setAccountOpen(false);
          setRechargeOpen(true);
        }}
      />

      {/* Upgrade Panel */}
      <UpgradePanel
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        onRecharge={() => {
          setUpgradeOpen(false);
          setRechargeOpen(true);
        }}
        onTeam={() => {
          setUpgradeOpen(false);
          setTeamOpen(true);
        }}
      />

      {/* Recharge Modal */}
      <RechargeModal
        open={rechargeOpen}
        onClose={() => setRechargeOpen(false)}
        balance={credits?.total}
      />

      {/* Team Modal */}
      <TeamModal
        open={teamOpen}
        onClose={() => setTeamOpen(false)}
      />
    </nav>
  );
}
