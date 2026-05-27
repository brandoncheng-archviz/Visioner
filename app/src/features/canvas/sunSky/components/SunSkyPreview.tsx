import { useMemo } from 'react';
import type { SunSkyState } from '../types/sunSky.types';
import { shadowLengthToPixels, shadowSoftnessToBlur, sunAnglesToVector } from '../utils/sunSkyMath';

export interface SunSkyPreviewProps {
  state: SunSkyState;
}

export function SunSkyPreview({ state }: SunSkyPreviewProps) {
  const { sun, derived, preview } = state;

  const sunVec = useMemo(() => sunAnglesToVector(sun.elevation, sun.azimuth), [sun.elevation, sun.azimuth]);
  const azimuthOffset = sun.azimuth <= 180 ? sun.azimuth : sun.azimuth - 360;
  const sunXPercent = 50 + (azimuthOffset / 180) * 42;
  const sunYPercent = 50 - (sun.elevation / 90) * 42;
  const lightFromRight = sunVec.x >= 0;
  const sphereHighlightX = lightFromRight ? '34%' : '66%';
  const sphereHighlightY = `${30 - sunVec.y * 12}%`;

  const shadowLen = shadowLengthToPixels(derived.shadowLength, 76);
  const shadowBlur = shadowSoftnessToBlur(derived.shadowSoftness, 8);
  const shadowOpacity = derived.directionStrength === 'weak' ? 0.16 : derived.directionStrength === 'medium' ? 0.26 : 0.42;
  const shadowAngle = (derived.shadowDirection * Math.PI) / 180;
  const shadowOffsetX = Math.sin(shadowAngle) * shadowLen;
  const shadowOffsetY = Math.cos(shadowAngle) * shadowLen * 0.22;
  const hazeOpacity = state.sky.condition === 'foggy' ? 0.5 : state.sky.condition === 'hazy' ? 0.34 : 0.16;

  if (preview.realtimeEnabled) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-[#10131a] text-center">
        <div className="mb-3 h-16 w-16 rounded-full border-2 border-dashed border-[#1f7dff] animate-spin" style={{ animationDuration: '3s' }} />
        <div className="text-sm font-medium text-white/78">实时预览准备中</div>
        <div className="mt-1 max-w-xs text-xs leading-relaxed text-white/45">后续可接入低清 AI 光照预演，当前使用物理示意预览。</div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full select-none overflow-hidden bg-[#0a0a0f]">
      <div
        className="absolute inset-x-0 top-0"
        style={{
          height: '63%',
          background: `
            radial-gradient(circle at ${sunXPercent}% ${sunYPercent}%, ${derived.sunColor}5c 0%, transparent 12%),
            linear-gradient(to bottom, ${derived.skyTopColor} 0%, ${derived.skyHorizonColor} 100%)
          `,
        }}
      />

      <div
        className="absolute inset-x-0"
        style={{
          top: '48%',
          height: '18%',
          background: `linear-gradient(to bottom, transparent 0%, ${derived.skyHorizonColor}66 48%, rgba(10,12,18,0.94) 100%)`,
          filter: `blur(${state.sky.horizonBlur * 12}px)`,
          opacity: 0.9,
        }}
      />

      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          height: '37%',
          background: 'linear-gradient(to bottom, #171b24 0%, #10131a 58%, #0c0f15 100%)',
        }}
      />

      <div
        className="absolute inset-x-0"
        style={{
          top: '63%',
          height: 1,
          background: 'rgba(255,255,255,0.11)',
          boxShadow: '0 1px 20px rgba(255,255,255,0.12)',
        }}
      />

      <div
        className="absolute inset-x-0 top-0"
        style={{
          height: '63%',
          background: `linear-gradient(to bottom, rgba(10,10,15,0.1), rgba(10,10,15,${hazeOpacity}))`,
          mixBlendMode: 'screen',
        }}
      />

      <div
        className="absolute"
        style={{
          left: `${sunXPercent}%`,
          top: `${sunYPercent}%`,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }}
      >
        <div
          className="absolute rounded-full"
          style={{
            width: 120,
            height: 120,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle, ${derived.sunColor}2f 0%, transparent 68%)`,
            filter: 'blur(4px)',
          }}
        />
        <div
          className="relative rounded-full"
          style={{
            width: 18 + sun.size * 1.2,
            height: 18 + sun.size * 1.2,
            background: derived.sunColor,
            boxShadow: `0 0 22px ${derived.sunColor}, 0 0 62px ${derived.sunColor}8a`,
          }}
        />
      </div>

      <div
        className="absolute"
        style={{
          left: '50%',
          top: '67%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div
          className="absolute rounded-full"
          style={{
            width: 88,
            height: 22,
            background: `rgba(0,0,0,${shadowOpacity})`,
            top: 48,
            left: '50%',
            transform: `translateX(-50%) translate(${shadowOffsetX}px, ${shadowOffsetY}px) rotate(${derived.shadowDirection - 90}deg)`,
            filter: `blur(${shadowBlur}px)`,
          }}
        />

        <div
          className="relative rounded-full"
          style={{
            width: 72,
            height: 72,
            background: `radial-gradient(circle at ${sphereHighlightX} ${sphereHighlightY}, ${derived.sunColor} 0%, #8c949f 22%, #303846 52%, #151922 82%)`,
            boxShadow: 'inset -10px -14px 24px rgba(0,0,0,0.5), 0 10px 30px rgba(0,0,0,0.36)',
          }}
        >
          <div
            className="absolute rounded-full"
            style={{
              width: 18,
              height: 10,
              top: '18%',
              left: lightFromRight ? '22%' : '56%',
              background: 'rgba(255,255,255,0.18)',
              filter: 'blur(2px)',
              transform: 'rotate(-18deg)',
            }}
          />
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.04), transparent 24%, rgba(0,0,0,0.2) 100%)',
        }}
      />
    </div>
  );
}
