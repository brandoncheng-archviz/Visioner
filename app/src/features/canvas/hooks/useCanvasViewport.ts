import { useCallback, useEffect, useRef, useState } from 'react';

type CanvasViewport = {
  x: number;
  y: number;
  zoom: number;
};

type ViewportOptions = {
  duration?: number;
};

export type CanvasPanDirection = 'up' | 'down' | 'left' | 'right';

type UseCanvasViewportParams = {
  getViewport: () => CanvasViewport;
  setViewport: (viewport: CanvasViewport, options?: ViewportOptions) => void;
  fitView: (options?: ViewportOptions & Record<string, unknown>) => void;
  defaultZoom?: number;
  minZoom: number;
  maxZoom: number;
  panStep?: number;
  zoomStep?: number;
};

export function useCanvasViewport({
  getViewport,
  setViewport,
  fitView,
  defaultZoom = 1,
  minZoom,
  maxZoom,
  panStep = 40,
  zoomStep = 1.15,
}: UseCanvasViewportParams) {
  const [zoom, setZoom] = useState(defaultZoom);
  const zoomRef = useRef(zoom);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const onViewportChange = useCallback((viewport: CanvasViewport) => {
    setZoom(viewport.zoom);
  }, []);

  const fitViewCanvas = useCallback(() => {
    fitView({ duration: 400 });
  }, [fitView]);

  const handleReset = useCallback(() => {
    fitViewCanvas();
  }, [fitViewCanvas]);

  const handleZoomChange = useCallback((value: number) => {
    const current = getViewport();
    const nextZoom = Math.min(Math.max(value, minZoom), maxZoom);
    setViewport({ x: current.x, y: current.y, zoom: nextZoom }, { duration: 0 });
  }, [getViewport, maxZoom, minZoom, setViewport]);

  const panViewport = useCallback((direction: CanvasPanDirection) => {
    const step = panStep / zoomRef.current;
    const current = getViewport();
    let dx = 0;
    let dy = 0;
    if (direction === 'up') dy = step;
    if (direction === 'down') dy = -step;
    if (direction === 'left') dx = step;
    if (direction === 'right') dx = -step;
    setViewport({ x: current.x + dx, y: current.y + dy, zoom: current.zoom }, { duration: 0 });
  }, [getViewport, panStep, setViewport]);

  const zoomIn = useCallback(() => {
    const current = getViewport();
    setViewport({ ...current, zoom: Math.min(current.zoom * zoomStep, maxZoom) }, { duration: 0 });
  }, [getViewport, maxZoom, setViewport, zoomStep]);

  const zoomOut = useCallback(() => {
    const current = getViewport();
    setViewport({ ...current, zoom: Math.max(current.zoom / zoomStep, minZoom) }, { duration: 0 });
  }, [getViewport, minZoom, setViewport, zoomStep]);

  return {
    zoom,
    zoomRef,
    onViewportChange,
    handleReset,
    handleZoomChange,
    panViewport,
    zoomIn,
    zoomOut,
    fitViewCanvas,
  };
}
