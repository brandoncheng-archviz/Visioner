import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FLOATING_PANEL_BACKGROUND, FLOATING_PANEL_BORDER } from '../constants/canvasConstants';
import { STYLE_PRESETS, getStylePresetById } from '../constants/presets';

const STYLE_DETAIL_DESCRIPTIONS: Record<string, string> = {
  mir_atmosphere:
    '整体画面偏低饱和，强调柔和自然光、空气感和空间叙事。建筑不应表现得过度锐利或商业化，而是与环境、植物、天空、人物活动和场地氛围自然融合。画面可以带有轻微雾感、柔和阴影、克制的色彩对比和电影化构图，让图像更像竞赛表现或概念建筑摄影，而不是普通地产效果图。',
  binyan_estate:
    '整体画面更明亮、干净、商业化，强调建筑表皮的清晰度、材料质感和空间秩序。光线通常更通透，色彩更稳定，构图偏向成熟的项目展示和地产宣传语境，让玻璃、石材、金属、铺装和景观都呈现高完成度、高清晰度和可销售的精致感。',
  luxigon_drama:
    '整体画面强调戏剧化光影、强对比和情绪张力，适合让建筑从环境中获得更强的视觉冲击力。画面会倾向使用更明确的明暗关系、深色天空、强烈边缘光或富有叙事感的人物活动，同时保留建筑的概念表达，让结果更像具有展览感和视觉记忆点的概念图。',
  real_estate_photo:
    '整体画面偏真实、清晰、稳定，强调可信的相机视角、自然光线和商业成片质感。色彩不会过度艺术化，材质会保持干净可读，构图会更注重建筑主体、入口、景观和周边环境的展示关系，让结果接近高质量地产效果图或建筑摄影后期成片。',
  soft_grey:
    '整体画面使用低饱和、高级灰和较克制的对比关系，弱化强烈色彩带来的干扰。光线会更柔和，阴影更细腻，材质表现更安静，构图更偏现代、理性和留白感，让建筑呈现一种冷静、克制、精致的视觉语言。',
  japanese_minimal:
    '整体画面强调自然、留白、柔和光线和安静的材质表达。色彩会更温和，构图更简洁，空间中会保留适度的空白与呼吸感，木材、混凝土、白墙、植物和自然光会被处理得更平衡，让结果呈现日系极简、生活化和温润的建筑氛围。',
  cinematic_arch_photo:
    '整体画面更像电影化建筑摄影，强调镜头感、叙事氛围和真实光影。色彩会更有情绪但不过度夸张，构图会更关注前景、中景、远景之间的层次，人物、植物、天空和环境会服务于场景故事，让生成结果更自然、更有现场感和画面情绪。',
  fresh_natural_residential:
    '整体画面偏清新、柔和、自然，强调住宅生活气息、景观融合和亲和力。光线会更温暖通透，植物和户外空间会更有生机，材质表现不会过度商业化，构图会更重视人尺度、绿化、庭院、阳台和日常活动，让建筑显得舒适、宜居、轻盈。',
};

export function StylePickerModal({
  open,
  selectedStyleId,
  onApply,
  onClose,
}: {
  open: boolean;
  selectedStyleId: string | null;
  onApply: (styleId: string | null) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [draftStyleId, setDraftStyleId] = useState<string | null>(selectedStyleId);
  const previewStyle = getStylePresetById(draftStyleId);
  const draftStyle = getStylePresetById(draftStyleId);

  useEffect(() => {
    if (!open) return;
    setDraftStyleId(selectedStyleId);
  }, [open, selectedStyleId]);

  const handleCancel = () => {
    onClose();
  };

  const handleConfirm = () => {
    onApply(draftStyleId);
    onClose();
  };

  const handleClear = () => {
    setDraftStyleId(null);
  };

  const handleApplyStyle = (styleId: string) => {
    onApply(styleId);
    onClose();
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/55"
      onPointerDown={(event) => event.stopPropagation()}
      onWheelCapture={(event) => event.stopPropagation()}
      onClick={(event) => {
        if (event.target === event.currentTarget) handleCancel();
      }}
    >
      <div
        className="flex max-h-[720px] w-[880px] max-w-[calc(100vw-48px)] flex-col overflow-hidden rounded-xl"
        style={{
          background: FLOATING_PANEL_BACKGROUND,
          border: FLOATING_PANEL_BORDER,
          boxShadow: '0 24px 70px rgba(0,0,0,0.62)',
        }}
      >
        <div className="flex items-start justify-between border-b px-5 py-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div>
            <div className="text-[16px] font-semibold text-white/92">{t('style.selectStyle')}</div>
            <div className="mt-1 text-[12px]" style={{ color: 'rgba(255,255,255,0.48)' }}>{t('style.styleSampleNotice')}</div>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-white/8"
            style={{ color: 'rgba(255,255,255,0.58)' }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          <div className="grid grid-cols-4 gap-3">
            {STYLE_PRESETS.map((style) => {
              const previewing = draftStyleId === style.id;
              return (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => setDraftStyleId(style.id)}
                  onDoubleClick={() => handleApplyStyle(style.id)}
                  className="group relative overflow-hidden rounded-lg border text-left transition-all"
                  style={{
                    background: previewing ? 'rgba(167,139,250,0.12)' : 'rgba(255,255,255,0.025)',
                    borderColor: previewing ? 'rgba(167,139,250,0.82)' : 'rgba(255,255,255,0.08)',
                    boxShadow: previewing ? '0 0 0 1px rgba(167,139,250,0.28), 0 10px 26px rgba(0,0,0,0.28)' : 'none',
                  }}
                >
                  <img src={style.thumbnail} alt="" className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                  <div className="px-3 py-2">
                    <div className="truncate text-[13px] font-medium text-white/88">{t(`style.${style.id}.title`)}</div>
                  </div>
                  {previewing && (
                    <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full" style={{ background: '#a78bfa', color: '#111' }}>
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-xl border p-4" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.028)' }}>
            {previewStyle ? (
              <>
                <div className="flex items-center gap-2">
                  <h3 className="text-[18px] font-semibold text-white/92">{t(`style.${previewStyle.id}.title`)}</h3>
                  {selectedStyleId === previewStyle.id && (
                    <span className="rounded-full px-2 py-0.5 text-[11px]" style={{ background: 'rgba(167,139,250,0.18)', color: '#c4b5fd' }}>{t('style.currentStyle')}</span>
                  )}
                </div>
                <p className="mt-3 text-[13px] leading-7" style={{ color: 'rgba(255,255,255,0.64)' }}>
                  {STYLE_DETAIL_DESCRIPTIONS[previewStyle.id] || t(`style.${previewStyle.id}.description`)}
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {previewStyle.tags.map((tag) => (
                    <span key={tag} className="rounded-md px-2 py-1 text-[11px]" style={{ background: 'rgba(167,139,250,0.12)', color: '#c4b5fd', border: '1px solid rgba(167,139,250,0.2)' }}>{tag}</span>
                  ))}
                </div>
              </>
            ) : (
              <div className="py-5">
                <h3 className="text-[18px] font-semibold text-white/92">{t('style.noStyle')}</h3>
                <p className="mt-2 text-[13px] leading-7" style={{ color: 'rgba(255,255,255,0.56)' }}>
                  清除风格后，生成结果将不再叠加整体视觉语言，只根据提示词、预设、引用图和模型参数进行生成。
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t px-5 py-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-[12px] text-white/40">{t('style.currentSelection')}</span>
            {draftStyle ? (
              <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px]" style={{ background: 'rgba(167,139,250,0.14)', color: '#c4b5fd', border: '1px solid rgba(167,139,250,0.24)' }}>
                {t(`style.${draftStyle.id}.title`)}
                <button type="button" onClick={handleClear} className="rounded-full hover:bg-white/10">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ) : (
              <span className="text-[12px] text-white/32">{t('style.noStyle')}</span>
            )}
            <button type="button" onClick={handleClear} className="text-[12px] transition-colors hover:text-white/70" style={{ color: 'rgba(255,255,255,0.42)' }}>{t('style.clearStyle')}</button>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleCancel} className="rounded-lg px-3 py-2 text-[13px] transition-colors hover:bg-white/8" style={{ color: 'rgba(255,255,255,0.62)' }}>{t('common.cancel')}</button>
            <button type="button" onClick={handleConfirm} className="rounded-lg px-3 py-2 text-[13px] font-medium" style={{ background: 'rgba(255,255,255,0.9)', color: '#111' }}>{t('style.confirmSelection')}</button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
