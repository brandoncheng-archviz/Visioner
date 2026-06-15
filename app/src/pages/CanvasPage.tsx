import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  useNodesState,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import { getProjectCanvasData, recentProjects } from '../data/siteData';
import { useToast } from '../features/canvas/hooks/useToast';
import type { ImageRole } from '../features/canvas/types/imageNode.types';
import { UNIQUE_USAGES, getImageRoleLabel } from '../features/canvas/constants/imageUsages';
import { CANVAS_MAX_ZOOM, CANVAS_MIN_ZOOM, CANVAS_NODE_CONTROL_SCALE as IMAGE_NODE_CONTROL_SCALE, DEFAULT_MODEL_PARAMS, IMAGE_NODE_CONTROL_WIDTH, IMAGE_NODE_PREVIEW_WIDTH, MAX_IMAGE_UPLOAD_SIZE, ACCEPTED_IMAGE_UPLOAD_TYPES } from '../features/canvas/constants/canvasConstants';
import { getRoleData } from '../features/canvas/utils/referenceUtils';
import { getNextCopiedNodeTitle, getNextNodeTitle } from '../features/canvas/utils/nodeNaming';
import { formatReferenceLimitIssue, getReferenceLimitIssueForAdd } from '../features/canvas/utils/referenceLimits';
import { HistoryProvider } from '../features/canvas/contexts/HistoryContext';
import { HistoryPanel } from '../features/canvas/components/HistoryPanel';
import type { GeneratedImage, ResultSetBatch } from '../features/canvas/types/history.types';
import type { GenerationHistoryItem, GenerationTask } from '../features/canvas/types/generation.types';
import type { RelightCreationOptions } from '../features/canvas/types/relight.types';
import type {
  TextNodeActionType,
  TextNodeData,
  TextNodeModel,
  TextReferenceInfo,
} from '../features/canvas/types/basicNode.types';
import type {
  ConnectionHandleType,
  CreateConnectionMenuState,
  TempConnectionState,
} from '../features/canvas/types/canvas.types';
import { GlobalDropForwarder } from '../features/canvas/components/GlobalDropForwarder';
import { CanvasStage } from '../features/canvas/components/CanvasStage';
import { CanvasSidebar } from '../features/canvas/components/CanvasSidebar';
import { CanvasContextMenus } from '../features/canvas/components/CanvasContextMenus';
import { CanvasToolbar } from '../features/canvas/components/CanvasToolbar';
import {
  TextNodeInputPanel,
  type TextNodeImageReference,
} from '../features/canvas/components/TextNodeInputPanel';
import {
  DEFAULT_TEXT_NODE_MODEL,
  TEXT_NODE_IMAGE_EXTRACTION_PROMPT,
  TEXT_NODE_WIDTH,
} from '../features/canvas/constants/textNode';
import {
  getTextContent,
  getTextNodeInstruction,
  getTextNodeSubmitState,
  isTextWorkflowConnection,
  simulateTextNodeResult,
} from '../features/canvas/utils/textNodeUtils';
import { getCurrentImage } from '../features/canvas/types/imageNodeData.types';
import {
  CREATE_NODE_MENU_TOP_OFFSET,
  CREATE_NODE_MENU_VIEWPORT_PADDING,
  CREATE_NODE_MENU_WIDTH,
} from '../features/canvas/constants/basicNodes';

const NODE_BASE_TITLES: Record<string, string> = {
  image: '图片',
  text: '文本节点',
  video: '视频',
  audio: '音频',
  script: '脚本',
  'video-merge': '视频合成',
  upscale: '高清细节',
  compare: '对比',
  sunSky: '光影',
  relight: '改光',
};

const UPSCALE_NODE_DEFAULTS: Record<string, unknown> = {
  engine: 'magnific_precision_v2',
  scale: 2,
  mode: 'preserve',
  fidelity: 0,
  sharpness: 7,
  denoise: 0,
  detail: 30,
  materialDetail: 7,
  compressionRepair: 0,
  status: 'idle',
  progress: 0,
  history: [],
  tlModel: 'general',
  tlScale: 4,
  mcUpscale: '2x',
  mcOptimized: 'standard',
  mcCreativity: 0,
  mcDetail: 0,
  mcSimilarity: 0,
  mcPromptStr: 0,
  mpUpscale: '2x',
  mpSharpen: 7,
  mpGrain: 7,
  mpUltra: 30,
};

type ImageFileRejectReason = 'unsupported-type' | 'too-large' | 'decode-failed';

type ImageFileReject = {
  file: File;
  reason: ImageFileRejectReason;
};

function getImageRejectMessage(rejectedFiles: ImageFileReject[], successCount: number): string {
  if (rejectedFiles.length === 0) return '';

  if (successCount > 0) {
    return '部分图片未添加，可能是格式不支持、超过 10MB 或图片无法读取。';
  }

  const reasons = new Set(rejectedFiles.map((item) => item.reason));
  const hasTooLarge = reasons.has('too-large');
  const hasUnsupported = reasons.has('unsupported-type');
  const hasDecodeFailed = reasons.has('decode-failed');

  if (hasTooLarge && !hasUnsupported && !hasDecodeFailed) {
    return '图片太大，已跳过。单张图片不能超过 10MB。';
  }

  if (hasUnsupported && !hasTooLarge && !hasDecodeFailed) {
    return '图片格式不支持。请使用 PNG、JPG、WEBP 或 GIF。';
  }

  if (hasDecodeFailed && !hasTooLarge && !hasUnsupported) {
    return '图片无法读取，已跳过。';
  }

  return '没有可添加的图片。请检查图片格式或文件大小。';
}

function getHistoryBatchForImage(image: GeneratedImage, batches: ResultSetBatch[]): ResultSetBatch | undefined {
  return batches.find((batch) =>
    batch.images.some((batchImage) => batchImage.resultId === image.resultId || batchImage.imageUrl === image.imageUrl),
  );
}

function createGeneratedNodeDataFromHistoryImage(image: GeneratedImage, batch?: ResultSetBatch) {
  const batchId = batch?.batchId || `history-result-${image.resultId}`;
  const createdAt = batch?.createdAt || Date.now();
  const prompt = batch?.prompt || '';
  const userPrompt = batch?.userPrompt || '';
  const inputRefs = batch?.inputRefs || [];
  const modelParams = batch?.modelParams || { ...DEFAULT_MODEL_PARAMS };
  const lightPreview = batch?.lightPreview ?? null;
  const result = {
    taskId: image.resultId,
    imageUrl: image.imageUrl,
    width: image.width,
    height: image.height,
    seed: image.seed,
    metadata: {
      prompt,
      model: modelParams.model,
      resolution: modelParams.resolution,
    },
  };
  const historyItem: GenerationHistoryItem = {
    resultId: image.resultId,
    batchId,
    batchIndex: 1,
    imageUrl: image.imageUrl,
    prompt,
    userPrompt,
    inputRefs,
    presetIds: batch?.presetIds || [],
    styleId: batch?.styleId ?? null,
    modelParams,
    seed: image.seed,
    width: image.width,
    height: image.height,
    createdAt,
  };
  const generationTask: GenerationTask = {
    taskId: batchId,
    sourceNodeId: batch?.nodeId || '',
    status: 'success',
    progress: 100,
    prompt,
    inputRefs,
    result,
    errorMessage: null,
    createdAt,
    updatedAt: createdAt,
  };

  return {
    image: image.imageUrl,
    currentImage: image.imageUrl,
    currentResultId: image.resultId,
    currentResultSet: {
      batchId,
      images: [image],
      selectedIndex: 0,
      isExpanded: false,
    },
    generatedImages: [historyItem],
    generationTask,
    prompt,
    textPrompt: prompt,
    promptContent: [],
    promptBlocks: [],
    selectedPresets: batch?.presetIds || [],
    selectedStyleId: batch?.styleId ?? null,
    finalPrompt: prompt,
    userPrompt,
    references: [],
    imageReferences: inputRefs,
    referenceImages: inputRefs,
    modelParams,
    lightPreview,
    currentResultSource: 'history',
    isGeneratedResult: true,
    generationStatus: 'completed',
    width: image.width,
    height: image.height,
  };
}

/* ─── Flow Inner ─── */

function FlowCanvas() {
  const { t } = useTranslation();
  const { projectId } = useParams<{ projectId?: string }>();
  const projectName = useMemo(() => {
    if (!projectId || projectId === 'new') return t('canvas.unnamedProject');
    return recentProjects.find((p) => p.id === projectId)?.name || t('canvas.unnamedProject');
  }, [projectId, t]);

  const defaultData = useMemo(() => {
    if (!projectId || projectId === 'new') return getProjectCanvasData('new');
    return getProjectCanvasData(projectId);
  }, [projectId]);

  const [nodes, setNodes, onNodesChange] = useNodesState(defaultData.nodes as Node[]);
  const { screenToFlowPosition, setViewport, getViewport, fitView } = useReactFlow();
  const { msg: toastMsg, show: showToast } = useToast();
  const objectUrlsRef = useRef<Set<string>>(new Set());
  useRevokeObjectUrlsOnUnmount(objectUrlsRef);

  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [historyPanelNodeId, setHistoryPanelNodeId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; flowPos: { x: number; y: number } } | null>(null);
  const [nodeContextMenu, setNodeContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const [textFocusRequestId, setTextFocusRequestId] = useState(0);
  const [textNodePanelPosition, setTextNodePanelPosition] = useState<{ left: number; top: number } | null>(null);

  // ─── Line Drawing State ───
  const [edges, setEdges] = useState<Edge[]>([]);
  const [tempLine, setTempLine] = useState<TempConnectionState | null>(null);
  const [createMenu, setCreateMenu] = useState<CreateConnectionMenuState | null>(null);
  const [rejectTooltip, setRejectTooltip] = useState<{ x: number; y: number; message: string } | null>(null);
  const isDrawingRef = useRef(false);

  const nodePositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Detect if adding an edge from source → target would create a cycle
  const wouldCreateCycle = useCallback((sourceId: string, targetId: string, currentEdges: Edge[]): boolean => {
    // Build adjacency list
    const adj = new Map<string, string[]>();
    currentEdges.forEach((e) => {
      if (!adj.has(e.source)) adj.set(e.source, []);
      adj.get(e.source)!.push(e.target);
    });
    // Add the hypothetical new edge
    if (!adj.has(sourceId)) adj.set(sourceId, []);
    adj.get(sourceId)!.push(targetId);

    // BFS from target: can we reach source?
    const visited = new Set<string>();
    const queue = [targetId];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (curr === sourceId) return true;
      if (visited.has(curr)) continue;
      visited.add(curr);
      (adj.get(curr) || []).forEach((next) => {
        if (!visited.has(next)) queue.push(next);
      });
    }
    return false;
  }, []);

  const startLineDraw = useCallback((
    nodeId: string,
    screenX: number,
    screenY: number,
    sourceHandleId = 'right-source',
    sourceHandleType: ConnectionHandleType = 'source',
  ) => {
    if (isDrawingRef.current) return;
    isDrawingRef.current = true;
    const posMap = new Map<string, { x: number; y: number }>();
    nodes.forEach((n) => posMap.set(n.id, { ...n.position }));
    nodePositionsRef.current = posMap;
    setTempLine({
      sourceNodeId: nodeId,
      sourceHandleId,
      sourceHandleType,
      currentX: screenX,
      currentY: screenY,
    });

    const clearHoverClasses = () => {
      document.querySelectorAll('.react-flow__node').forEach((n) => {
        n.classList.remove('can-connect', 'cannot-connect');
      });
    };

    const getNodeHandle = (targetId: string, handleType: ConnectionHandleType) =>
      document.querySelector(
        `.react-flow__node[data-id="${targetId}"] .image-node-handle[data-handle-type="${handleType}"], ` +
        `.react-flow__node[data-id="${targetId}"] .image-node-handle.${handleType === 'source' ? 'output-port' : 'input-port'}`,
      );

    const getHandleType = (handle: Element): ConnectionHandleType | null => {
      const explicitType = handle.getAttribute('data-handle-type');
      if (explicitType === 'source' || explicitType === 'target') return explicitType;
      if (handle.getAttribute('data-port-type') === 'output') return 'source';
      if (handle.getAttribute('data-port-type') === 'input') return 'target';
      return null;
    };

    const resolveConnection = (
      otherNodeId: string,
      dropHandle: Element | null | undefined,
    ): {
      sourceId: string;
      targetId: string;
      sourceHandleId: string;
      targetHandleId: string;
      sourceHandle: Element;
      targetHandle: Element;
    } | null => {
      const requiredDropType: ConnectionHandleType = sourceHandleType === 'source' ? 'target' : 'source';
      const effectiveDropHandle = dropHandle ?? getNodeHandle(otherNodeId, requiredDropType);
      if (!effectiveDropHandle || getHandleType(effectiveDropHandle) !== requiredDropType) {
        return null;
      }

      const originNode = document.querySelector(`.react-flow__node[data-id="${nodeId}"]`);
      const originHandle = originNode?.querySelector(
        `[data-handle-id="${sourceHandleId}"], ${
          sourceHandleType === 'source' ? '.image-node-handle.output-port' : '.image-node-handle.input-port'
        }`,
      );
      const dropHandleId = effectiveDropHandle.getAttribute('data-handle-id')
        || (requiredDropType === 'source' ? 'right-source' : 'left-target');
      if (!originHandle || !dropHandleId) return null;

      if (sourceHandleType === 'source') {
        return {
          sourceId: nodeId,
          targetId: otherNodeId,
          sourceHandleId,
          targetHandleId: dropHandleId,
          sourceHandle: originHandle,
          targetHandle: effectiveDropHandle,
        };
      }

      return {
        sourceId: otherNodeId,
        targetId: nodeId,
        sourceHandleId: dropHandleId,
        targetHandleId: sourceHandleId,
        sourceHandle: effectiveDropHandle,
        targetHandle: originHandle,
      };
    };

    const validateConnection = (
      connection: ReturnType<typeof resolveConnection>,
    ): string | null => {
      if (!connection) return t('error.wrongPortDirection');

      const {
        sourceId,
        targetId,
        sourceHandle,
        targetHandle,
      } = connection;
      if (sourceId === targetId) return t('error.selfConnect');

      const sourceNode = nodes.find((n) => n.id === sourceId);
      const targetNode = nodes.find((n) => n.id === targetId);
      const sourceDataType = sourceHandle.getAttribute('data-data-type');
      const targetDataType = targetHandle.getAttribute('data-data-type');
      if (
        sourceDataType !== targetDataType &&
        !isTextWorkflowConnection(sourceNode?.type, targetNode?.type)
      ) {
        return t('error.portTypeMismatch');
      }

      if (wouldCreateCycle(sourceId, targetId, edges)) return t('error.cycleDetected');

      const alreadyConnected = edges.some((e) => e.source === sourceId && e.target === targetId);
      if (alreadyConnected) return t('error.alreadyConnected');

      // Compare node max 2 images
      if (targetNode?.type === 'compare') {
        const targetInputEdges = edges.filter((e) => e.target === targetId);
        if (targetInputEdges.length >= 2) {
          return t('error.compareMaxTwoImages');
        }
      }

      const sourceRole = (sourceNode?.data?.role as ImageRole | null | undefined) ?? null;

      if (targetNode?.type === 'image' && sourceNode?.type === 'image') {
        const targetInputEdges = edges.filter((e) => {
          if (e.target !== targetId) return false;
          return nodes.find((node) => node.id === e.source)?.type === 'image';
        });
        const targetReferences = targetInputEdges.map((edge) => {
          const refNode = nodes.find((n) => n.id === edge.source);
          return {
            nodeId: edge.source,
            role: (edge.data?.role as ImageRole | null | undefined) ?? ((refNode?.data?.role as ImageRole | null | undefined) ?? null),
          };
        });
        const limitIssue = getReferenceLimitIssueForAdd(targetReferences, sourceRole);
        if (limitIssue) {
          return formatReferenceLimitIssue(limitIssue);
        }
      }

      // 唯一用途检查
      if (sourceRole && UNIQUE_USAGES.includes(sourceRole)) {
        const targetInputEdges = edges.filter((e) => e.target === targetId);
        const hasSameRole = targetInputEdges.some((edge) => {
          const refNode = nodes.find((n) => n.id === edge.source);
          const effectiveRole = (edge.data?.role as ImageRole | null | undefined) ?? ((refNode?.data?.role as ImageRole | null | undefined) ?? null);
          return effectiveRole === sourceRole;
        });
        if (hasSameRole) {
          return t('reference.usageConflict', { role: getImageRoleLabel(sourceRole) });
        }
      }

      return null;
    };

    const handleMouseMove = (e: PointerEvent) => {
      if (!isDrawingRef.current) return;
      setTempLine((prev) => prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null);
      // 恢复所有节点位置，阻止 React Flow 移动它们
      setNodes((nds) => nds.map((n) => {
        const original = nodePositionsRef.current.get(n.id);
        return original ? { ...n, position: original } : n;
      }));

      // 清除之前的 hover 状态
      clearHoverClasses();

      // 检测当前鼠标下方的节点，实时显示可连接/不可连接反馈
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const nodeEl = el?.closest('.react-flow__node');
      const targetId = nodeEl?.getAttribute('data-id');
      if (targetId && nodeEl) {
        const hoveredHandle = el?.closest('.image-node-handle');
        const error = targetId === nodeId
          ? t('error.selfConnect')
          : validateConnection(resolveConnection(targetId, hoveredHandle));
        if (error) {
          nodeEl.classList.add('cannot-connect');
          setRejectTooltip({ x: e.clientX, y: e.clientY, message: error });
        } else {
          nodeEl.classList.add('can-connect');
          setRejectTooltip(null);
        }
      } else {
        setRejectTooltip(null);
      }
    };

    const handleMouseUp = (e: PointerEvent) => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;

      window.removeEventListener('pointermove', handleMouseMove);
      window.removeEventListener('pointerup', handleMouseUp);
      clearHoverClasses();

      // 检测落点是否落在某个节点上（不限于 input port）
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const dropHandle = el?.closest('.image-node-handle');
      const nodeEl = dropHandle?.closest('.react-flow__node') ?? el?.closest('.react-flow__node');
      const targetId = nodeEl?.getAttribute('data-id');

      // ─── Connection validation ───
      const fail = () => {
        setRejectTooltip({ x: e.clientX, y: e.clientY, message: t('canvas.cannotConnect') });
        setTimeout(() => setRejectTooltip((prev) => (prev ? null : prev)), 500);
        setTempLine(null);
      };

      if (!targetId) {
        const startsOnLeft = sourceHandleId.startsWith('left-');
        const unclampedMenuX = startsOnLeft
          ? e.clientX - CREATE_NODE_MENU_WIDTH
          : e.clientX;
        const maxMenuX = Math.max(
          CREATE_NODE_MENU_VIEWPORT_PADDING,
          window.innerWidth - CREATE_NODE_MENU_WIDTH - CREATE_NODE_MENU_VIEWPORT_PADDING,
        );
        const menuX = Math.min(
          Math.max(CREATE_NODE_MENU_VIEWPORT_PADDING, unclampedMenuX),
          maxMenuX,
        );
        const menuY = Math.max(
          CREATE_NODE_MENU_VIEWPORT_PADDING,
          e.clientY - CREATE_NODE_MENU_TOP_OFFSET,
        );
        const lineEndX = startsOnLeft ? menuX + CREATE_NODE_MENU_WIDTH : menuX;

        setTempLine((prev) => prev ? {
          ...prev,
          currentX: lineEndX,
          currentY: e.clientY,
        } : null);
        setCreateMenu({
          x: menuX,
          y: menuY,
          flowPos: screenToFlowPosition({ x: menuX, y: menuY }),
          sourceNodeId: nodeId,
          sourceHandleId,
          sourceHandleType,
        });
        return;
      }

      if (!nodeEl) { fail(); return; }
      const connection = resolveConnection(targetId, dropHandle);
      const error = validateConnection(connection);
      if (error) {
        setRejectTooltip({ x: e.clientX, y: e.clientY, message: error });
        setTimeout(() => setRejectTooltip((prev) => (prev ? null : prev)), 1200);
        setTempLine(null);
        return;
      }

      // All checks passed — create edge
      if (!connection) {
        fail();
        return;
      }
      setEdges((eds) => [...eds, {
        id: `e-${Date.now()}`,
        source: connection.sourceId,
        target: connection.targetId,
        sourceHandle: connection.sourceHandleId,
        targetHandle: connection.targetHandleId,
        style: { stroke: '#555', strokeWidth: 1 },
      }]);
      setTempLine(null);
    };

    window.addEventListener('pointermove', handleMouseMove);
    window.addEventListener('pointerup', handleMouseUp);
  }, [screenToFlowPosition, nodes, edges, wouldCreateCycle]);

  // Update edge styles when node selection changes (connected edges turn cyan)
  const selectedIdsRef = useRef('');
  useEffect(() => {
    const ids = nodes.filter((n) => n.selected).map((n) => n.id).sort().join(',');
    if (ids === selectedIdsRef.current) return;
    selectedIdsRef.current = ids;

    const selectedNodeIds = new Set(nodes.filter((n) => n.selected).map((n) => n.id));
    setEdges((eds) => eds.map((edge) => {
      const isConnected = selectedNodeIds.has(edge.source) || selectedNodeIds.has(edge.target);
      return {
        ...edge,
        selected: isConnected,
        style: isConnected ? { stroke: '#00d4ff', strokeWidth: 1 } : { stroke: '#555', strokeWidth: 1 },
      };
    }));
  }, [nodes]);

  const removeReferenceEdge = useCallback((targetNodeId: string, sourceNodeId: string) => {
    setEdges((eds) => eds.filter((edge) => !(edge.source === sourceNodeId && edge.target === targetNodeId)));
  }, []);

  const swapCompareInputs = useCallback((targetNodeId: string, leftSourceNodeId: string, rightSourceNodeId: string) => {
    setEdges((eds) => {
      const leftEdge = eds.find((edge) => edge.target === targetNodeId && edge.source === leftSourceNodeId);
      const rightEdge = eds.find((edge) => edge.target === targetNodeId && edge.source === rightSourceNodeId);
      if (!leftEdge || !rightEdge) return eds;

      return eds.map((edge) => {
        if (edge.id === leftEdge.id) {
          return { ...edge, source: rightEdge.source, sourceHandle: rightEdge.sourceHandle };
        }
        if (edge.id === rightEdge.id) {
          return { ...edge, source: leftEdge.source, sourceHandle: leftEdge.sourceHandle };
        }
        return edge;
      });
    });
  }, []);

  const assignReferenceEdgeRole = useCallback((targetNodeId: string, sourceNodeId: string, role: ImageRole, customRoleLabel?: string, localReferenceType?: import('../features/canvas/types/imageNode.types').LocalReferenceType, localReferenceLabel?: string) => {
    const roleData = getRoleData(role, customRoleLabel, localReferenceType, localReferenceLabel);
    setEdges((eds) =>
      eds.map((edge) =>
        edge.source === sourceNodeId && edge.target === targetNodeId
          ? { ...edge, data: { ...edge.data, ...roleData } }
          : edge,
      ),
    );
    setNodes((nds) => nds.map((node) => (node.id === sourceNodeId ? { ...node, data: { ...node.data, ...roleData } } : node)));
  }, []);

  const getAllNodeLabels = useCallback(
    () => nodes.map((n) => (n.data?.label as string) || '').filter(Boolean),
    [nodes],
  );

  const createUpscaleNode = useCallback((sourceNodeId: string, inputImage: string, width: number, height: number) => {
    const sourceNode = nodes.find((n) => n.id === sourceNodeId);
    if (!sourceNode) return;

    const newNodeId = `upscale-${Date.now()}`;
    const label = getNextNodeTitle(getAllNodeLabels(), NODE_BASE_TITLES.upscale);
    const spacing = 80;
    const estimatedWidth = sourceNode.width || IMAGE_NODE_PREVIEW_WIDTH;

    const newNode: Node = {
      id: newNodeId,
      type: 'upscale',
      position: {
        x: sourceNode.position.x + estimatedWidth + spacing,
        y: sourceNode.position.y,
      },
      data: {
        label,
        inputImage,
        image: inputImage,
        width,
        height,
        ...UPSCALE_NODE_DEFAULTS,
      },
      selected: true,
    };

    setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), newNode]);
    setEdges((eds) => [
      ...eds,
      {
        id: `e-${Date.now()}`,
        source: sourceNodeId,
        target: newNodeId,
        sourceHandle: 'right-source',
        targetHandle: 'left-target',
        style: { stroke: '#555', strokeWidth: 1 },
      },
    ]);

    setTimeout(() => {
      fitView({
        nodes: [{ id: newNodeId }],
        duration: 300,
        padding: 0.15,
        maxZoom: Math.min(getViewport().zoom, 1.2),
      });
    }, 50);
  }, [nodes, setNodes, setEdges, fitView, getViewport, t, getAllNodeLabels]);

  const createSunSkyNode = useCallback((sourceNodeId: string, inputImage: string, width: number, height: number) => {
    const sourceNode = nodes.find((n) => n.id === sourceNodeId);
    if (!sourceNode) return;

    const newNodeId = `sunSky-${Date.now()}`;
    const label = getNextNodeTitle(getAllNodeLabels(), NODE_BASE_TITLES.sunSky);
    const spacing = 80;
    const estimatedWidth = sourceNode.width || IMAGE_NODE_PREVIEW_WIDTH;

    const newNode: Node = {
      id: newNodeId,
      type: 'sunSky',
      position: {
        x: sourceNode.position.x + estimatedWidth + spacing,
        y: sourceNode.position.y,
      },
      data: {
        label,
        inputImage,
        image: inputImage,
        width,
        height,
      },
      selected: true,
    };

    setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), newNode]);
    setEdges((eds) => [
      ...eds,
      {
        id: `e-${Date.now()}`,
        source: sourceNodeId,
        target: newNodeId,
        sourceHandle: 'right-source',
        targetHandle: 'left-target',
        style: { stroke: '#555', strokeWidth: 1 },
      },
    ]);

    setTimeout(() => {
      fitView({
        nodes: [{ id: newNodeId }],
        duration: 300,
        padding: 0.15,
        maxZoom: Math.min(getViewport().zoom, 1.2),
      });
    }, 50);
  }, [nodes, setNodes, setEdges, fitView, getViewport, t, getAllNodeLabels]);

  const createRelightNode = useCallback((
    sourceNodeId: string,
    inputImage: string,
    width: number,
    height: number,
    options?: RelightCreationOptions,
  ) => {
    const sourceNode = nodes.find((n) => n.id === sourceNodeId);
    if (!sourceNode) return;

    const newNodeId = `relight-${Date.now()}`;
    const label = getNextNodeTitle(getAllNodeLabels(), NODE_BASE_TITLES.relight);
    const spacing = 80;
    const estimatedWidth = sourceNode.measured?.width || sourceNode.width || IMAGE_NODE_PREVIEW_WIDTH;

    const newNode: Node = {
      id: newNodeId,
      type: 'relight',
      position: {
        x: sourceNode.position.x + estimatedWidth + spacing,
        y: sourceNode.position.y,
      },
      data: {
        generationMode: 'relight',
        label,
        sourceImageNodeIds: [sourceNodeId],
        status: 'empty',
        viewMode: 'edit',
        inputImage,
        width,
        height,
        lightPreview: options?.lightPreview
          ? {
              ...options.lightPreview,
              sun: { ...options.lightPreview.sun },
              derived: { ...options.lightPreview.derived },
            }
          : undefined,
        relightSettings: options?.relightSettings ? { ...options.relightSettings } : undefined,
      },
      selected: true,
    };

    setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), newNode]);
    setEdges((eds) => [
      ...eds,
      {
        id: `e-${Date.now()}`,
        source: sourceNodeId,
        target: newNodeId,
        sourceHandle: 'right-source',
        targetHandle: 'left-target',
        style: { stroke: '#555', strokeWidth: 1 },
      },
    ]);

    setTimeout(() => {
      fitView({
        nodes: [{ id: newNodeId }],
        duration: 300,
        padding: 0.15,
        maxZoom: Math.min(getViewport().zoom, 1.2),
      });
    }, 50);
  }, [nodes, setNodes, setEdges, fitView, getViewport, getAllNodeLabels]);

  const createCompareNode = useCallback((sourceNodeId: string) => {
    const sourceNode = nodes.find((n) => n.id === sourceNodeId);
    if (!sourceNode) return;

    // ── Strategy: reuse the most-recent pending CompareNode (exactly 1 input edge) ──
    const compareNodes = nodes.filter((n) => n.type === 'compare');
    const pendingList = compareNodes
      .map((node) => {
        const inputEdges = edges.filter((e) => e.target === node.id);
        return { node, inputEdges, inputCount: inputEdges.length };
      })
      .filter(({ inputCount, inputEdges }) => {
        // Only nodes with exactly one image connected
        if (inputCount !== 1) return false;
        // Avoid re-connecting the same source node
        const alreadyConnected = inputEdges.some((e) => e.source === sourceNodeId);
        if (alreadyConnected) return false;
        return true;
      })
      .sort((a, b) => {
        // Most recently created first (compare-${timestamp})
        const aTime = parseInt(a.node.id.replace('compare-', ''), 10) || 0;
        const bTime = parseInt(b.node.id.replace('compare-', ''), 10) || 0;
        return bTime - aTime;
      });

    if (pendingList.length > 0) {
      const targetCompare = pendingList[0].node;
      setEdges((eds) => [
        ...eds,
        {
          id: `e-${Date.now()}`,
          source: sourceNodeId,
          target: targetCompare.id,
          sourceHandle: 'right-source',
          targetHandle: 'left-target',
          style: { stroke: '#555', strokeWidth: 1 },
        },
      ]);
      setTimeout(() => {
        fitView({
          nodes: [{ id: targetCompare.id }],
          duration: 300,
          padding: 0.15,
          maxZoom: Math.min(getViewport().zoom, 1.2),
        });
      }, 50);
      return;
    }

    // ── Fallback: create a brand-new CompareNode ──
    const newNodeId = `compare-${Date.now()}`;
    const label = getNextNodeTitle(getAllNodeLabels(), NODE_BASE_TITLES.compare);
    const spacing = 80;
    const estimatedWidth = sourceNode.width || IMAGE_NODE_PREVIEW_WIDTH;

    const newNode: Node = {
      id: newNodeId,
      type: 'compare',
      position: {
        x: sourceNode.position.x + estimatedWidth + spacing,
        y: sourceNode.position.y,
      },
      data: {
        label,
        sliderPosition: 50,
      },
      selected: true,
    };

    setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), newNode]);
    setEdges((eds) => [
      ...eds,
      {
        id: `e-${Date.now()}`,
        source: sourceNodeId,
        target: newNodeId,
        sourceHandle: 'right-source',
        targetHandle: 'left-target',
        style: { stroke: '#555', strokeWidth: 1 },
      },
    ]);

    setTimeout(() => {
      fitView({
        nodes: [{ id: newNodeId }],
        duration: 300,
        padding: 0.15,
        maxZoom: Math.min(getViewport().zoom, 1.2),
      });
    }, 50);
  }, [nodes, edges, setNodes, setEdges, fitView, getViewport, t, getAllNodeLabels]);

  const focusCanvasNode = useCallback((nodeId: string) => {
    setNodes((currentNodes) =>
      currentNodes.map((node) => ({ ...node, selected: node.id === nodeId })),
    );
    setTimeout(() => {
      fitView({
        nodes: [{ id: nodeId }],
        duration: 280,
        padding: 0.4,
        maxZoom: Math.min(getViewport().zoom, 1.15),
      });
    }, 0);
  }, [fitView, getViewport, setNodes]);

  const handleTextAction = useCallback((nodeId: string, action: TextNodeActionType) => {
    const textNode = nodes.find((node) => node.id === nodeId && node.type === 'text');
    if (!textNode) return;
    setActivePanel(null);

    if (action === 'text_to_image') {
      const newNodeId = `image-${Date.now()}`;
      const label = getNextNodeTitle(getAllNodeLabels(), NODE_BASE_TITLES.image);
      const newNode: Node = {
        id: newNodeId,
        type: 'image',
        position: {
          x: textNode.position.x + TEXT_NODE_WIDTH + 100,
          y: textNode.position.y,
        },
        data: {
          label,
          ...getRoleData(null),
        },
        selected: true,
      };
      setNodes((currentNodes) => [
        ...currentNodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                selected: false,
                data: {
                  ...node.data,
                  lastActionType: action,
                  outputTargetImageNodeIds: [
                    ...new Set([
                      ...(((node.data.outputTargetImageNodeIds as string[]) || [])),
                      newNodeId,
                    ]),
                  ],
                },
              }
            : { ...node, selected: false },
        ),
        newNode,
      ]);
      setEdges((currentEdges) => [
        ...currentEdges,
        {
          id: `e-text-image-${Date.now()}`,
          source: nodeId,
          target: newNodeId,
          sourceHandle: 'right-source',
          targetHandle: 'left-target',
          style: { stroke: '#555', strokeWidth: 1 },
        },
      ]);
      return;
    }

    let sourceImageNodeId: string | null = null;
    let sourceImageNode: Node | null = null;
    if (action === 'image_to_text') {
      const existingEdge = edges.find((edge) => {
        if (edge.target !== nodeId) return false;
        return nodes.find((node) => node.id === edge.source)?.type === 'image';
      });
      sourceImageNodeId = existingEdge?.source || null;

      if (!sourceImageNodeId) {
        sourceImageNodeId = `image-${Date.now()}`;
        const label = getNextNodeTitle(getAllNodeLabels(), NODE_BASE_TITLES.image);
        sourceImageNode = {
          id: sourceImageNodeId,
          type: 'image',
          position: {
            x: textNode.position.x - 540,
            y: textNode.position.y,
          },
          data: {
            label,
            isTextSourceAsset: true,
            ...getRoleData(null),
          },
        };
      }
    }

    const editorInput = action === 'image_to_text' ? TEXT_NODE_IMAGE_EXTRACTION_PROMPT : '';
    setNodes((currentNodes) => {
      const updatedNodes = currentNodes.map((node) => ({
        ...node,
        selected: node.id === nodeId,
        data: node.id === nodeId
          ? {
              ...node.data,
              status: 'editing',
              lastActionType: action,
              editorInput,
              activeModel: (node.data.activeModel as TextNodeModel | undefined) || DEFAULT_TEXT_NODE_MODEL,
              ...(sourceImageNodeId
                ? {
                    referencedImageNodeIds: [
                      ...new Set([
                        ...(((node.data.referencedImageNodeIds as string[]) || [])),
                        sourceImageNodeId,
                      ]),
                    ],
                  }
                : {}),
            }
          : node.data,
      }));
      return sourceImageNode ? [...updatedNodes, sourceImageNode] : updatedNodes;
    });

    if (sourceImageNodeId && sourceImageNode) {
      setEdges((currentEdges) => [
        ...currentEdges,
        {
          id: `e-image-text-${Date.now()}`,
          source: sourceImageNodeId,
          target: nodeId,
          sourceHandle: 'right-source',
          targetHandle: 'left-target',
          style: { stroke: '#555', strokeWidth: 1 },
        },
      ]);
      const createdSourceNodeId = sourceImageNodeId;
      setTimeout(() => {
        fitView({
          nodes: [{ id: createdSourceNodeId }, { id: nodeId }],
          duration: 300,
          padding: 0.2,
          maxZoom: Math.min(getViewport().zoom, 1),
        });
      }, 0);
    }
    setTextFocusRequestId((value) => value + 1);
  }, [edges, fitView, getAllNodeLabels, getViewport, nodes, setEdges, setNodes]);

  const nodesWithCallbacks = useMemo(() => {
    return nodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        onStartLineDraw: startLineDraw,
        onRemoveReferenceEdge: removeReferenceEdge,
        onSwapCompareInputs: swapCompareInputs,
        onAssignReferenceEdgeRole: assignReferenceEdgeRole,
        onCreateUpscaleNode: n.type === 'image' || n.type === 'upscale' || n.type === 'relight' ? createUpscaleNode : undefined,
        onCreateSunSkyNode: n.type === 'image' ? createSunSkyNode : undefined,
        onCreateCompareNode: n.type === 'image' || n.type === 'relight' ? createCompareNode : undefined,
        onCreateRelightNode: n.type === 'image' || n.type === 'relight' ? createRelightNode : undefined,
        onTextAction: n.type === 'text' ? handleTextAction : undefined,
        onFocusNode: n.type === 'image' ? focusCanvasNode : undefined,
        onOpenNodeHistory: n.type === 'image' ? (nodeId: string) => setHistoryPanelNodeId(nodeId) : undefined,
        onRegisterObjectUrl: n.type === 'image' ? (url: string) => { objectUrlsRef.current.add(url); } : undefined,
      },
    }));
  }, [nodes, startLineDraw, removeReferenceEdge, swapCompareInputs, assignReferenceEdgeRole, createUpscaleNode, createSunSkyNode, createCompareNode, createRelightNode, handleTextAction, focusCanvasNode]);

  // ─── Copy / Paste / Delete ───
  const clipboardRef = useRef<{ type: string; data: Record<string, unknown>; position: { x: number; y: number } }[]>([]);
  const pasteOffsetRef = useRef(0);

  const copyNodes = useCallback(() => {
    const selected = nodes.filter((n) => n.selected);
    if (selected.length === 0) return;
    clipboardRef.current = selected.map((n) => ({
      type: n.type!,
      data: { ...n.data, generationTask: null },
      position: { ...n.position },
    }));
    pasteOffsetRef.current = 0;
  }, [nodes]);

  const pasteNodes = useCallback(() => {
    if (clipboardRef.current.length === 0) return;
    pasteOffsetRef.current += 40;
    const offset = pasteOffsetRef.current;
    const existingLabels = getAllNodeLabels();
    const assignedLabels: string[] = [];
    const pasted = clipboardRef.current.map((n, i) => {
      const fallbackBaseTitle = NODE_BASE_TITLES[n.type] || n.type;
      const nextLabel = getNextCopiedNodeTitle(
        [...existingLabels, ...assignedLabels],
        (n.data.label as string | undefined) || '',
        fallbackBaseTitle,
      );
      assignedLabels.push(nextLabel);
      return {
        id: `${n.type}-${Date.now()}-${i}`,
        type: n.type,
        position: { x: n.position.x + offset, y: n.position.y + offset },
        data: { ...n.data, label: nextLabel },
        selected: true,
      };
    });
    setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), ...pasted]);
  }, [getAllNodeLabels, setNodes]);

  const deleteSelected = useCallback(() => {
    const hasSelectedNodes = nodes.some((n) => n.selected);
    const hasSelectedEdges = edges.some((e) => e.selected);
    if (!hasSelectedNodes && !hasSelectedEdges) return;
    setNodes((nds) => nds.filter((n) => !n.selected));
    setEdges((eds) => eds.filter((e) => !e.selected));
  }, [nodes, edges, setNodes, setEdges]);

  // ─── History (Undo / Redo) ───
  const historyRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const historyIndexRef = useRef(-1);
  const skipHistoryRef = useRef(false);

  useEffect(() => {
    if (skipHistoryRef.current) {
      skipHistoryRef.current = false;
      return;
    }
    const last = historyRef.current[historyIndexRef.current];
    if (
      last &&
      JSON.stringify(last.nodes) === JSON.stringify(nodes) &&
      JSON.stringify(last.edges) === JSON.stringify(edges)
    ) {
      return;
    }
    historyIndexRef.current += 1;
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current);
    historyRef.current.push({ nodes: [...nodes], edges: [...edges] });
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
      historyIndexRef.current -= 1;
    }
  }, [nodes, edges]);

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const state = historyRef.current[historyIndexRef.current];
      skipHistoryRef.current = true;
      setNodes(state.nodes);
      setEdges(state.edges);
    }
  }, [setNodes, setEdges]);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      const state = historyRef.current[historyIndexRef.current];
      skipHistoryRef.current = true;
      setNodes(state.nodes);
      setEdges(state.edges);
    }
  }, [setNodes, setEdges]);

  const selectAll = useCallback(() => {
    setNodes((nds) => nds.map((n) => ({ ...n, selected: true })));
  }, [setNodes]);

  const deselectAll = useCallback(() => {
    setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
    setEdges((eds) => eds.map((e) => ({ ...e, selected: false })));
  }, [setNodes, setEdges]);

  const duplicateNode = useCallback((id: string) => {
    const node = nodes.find((n) => n.id === id);
    if (!node) return;
    const fallbackBaseTitle = NODE_BASE_TITLES[node.type || ''] || node.type || '节点';
    const label = getNextCopiedNodeTitle(getAllNodeLabels(), (node.data?.label as string | undefined) || '', fallbackBaseTitle);
    const newNode: Node = {
      ...node,
      id: `${node.type}-${Date.now()}`,
      position: { x: node.position.x + 40, y: node.position.y + 40 },
      data: { ...node.data, label },
      selected: true,
    };
    setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), newNode]);
    setNodeContextMenu(null);
  }, [getAllNodeLabels, nodes, setNodes]);

  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    const target = event.target as HTMLElement;
    if (!target.closest('.node-preview-card')) {
      setNodeContextMenu(null);
      return;
    }
    setContextMenu(null);
    setNodeContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
  }, []);

  // ─── Selection Marquee Pre-highlight ───
  const isSelectingRef = useRef(false);
  const rAFIdRef = useRef<number | null>(null);

  const clearPreselection = useCallback(() => {
    document.querySelectorAll('.react-flow__node.preselected').forEach((el) => {
      el.classList.remove('preselected');
    });
  }, []);

  const updatePreselection = useCallback(() => {
    if (!isSelectingRef.current) return;
    const selectionEl = document.querySelector('.react-flow__selection') as HTMLElement | null;
    if (!selectionEl) {
      clearPreselection();
      rAFIdRef.current = requestAnimationFrame(updatePreselection);
      return;
    }
    const selRect = selectionEl.getBoundingClientRect();
    const preselected = new Set<string>();

    document.querySelectorAll('.react-flow__node').forEach((el) => {
      const nodeRect = el.getBoundingClientRect();
      const intersects = !(
        selRect.right < nodeRect.left ||
        selRect.left > nodeRect.right ||
        selRect.bottom < nodeRect.top ||
        selRect.top > nodeRect.bottom
      );
      const id = (el as HTMLElement).dataset.id;
      if (intersects && id) {
        preselected.add(id);
        el.classList.add('preselected');
      } else {
        el.classList.remove('preselected');
      }
    });

    rAFIdRef.current = requestAnimationFrame(updatePreselection);
  }, [clearPreselection]);

  const onSelectionStart = useCallback(() => {
    isSelectingRef.current = true;
    if (rAFIdRef.current) cancelAnimationFrame(rAFIdRef.current);
    rAFIdRef.current = requestAnimationFrame(updatePreselection);
  }, [updatePreselection]);

  const onSelectionEnd = useCallback(() => {
    isSelectingRef.current = false;
    if (rAFIdRef.current) {
      cancelAnimationFrame(rAFIdRef.current);
      rAFIdRef.current = null;
    }
    clearPreselection();
  }, [clearPreselection]);

  // ─── Toolbar State (showHelp used in keyboard shortcuts) ───
  const [showHelp, setShowHelp] = useState(false);

  // ─── Keyboard Shortcuts ───
  const copyRef = useRef(copyNodes);
  const pasteRef = useRef(pasteNodes);
  const deleteRef = useRef(deleteSelected);
  const undoRef = useRef(undo);
  const redoRef = useRef(redo);
  const selectAllRef = useRef(selectAll);
  const deselectAllRef = useRef(deselectAll);
  useEffect(() => { copyRef.current = copyNodes; }, [copyNodes]);
  useEffect(() => { pasteRef.current = pasteNodes; }, [pasteNodes]);
  useEffect(() => { deleteRef.current = deleteSelected; }, [deleteSelected]);
  useEffect(() => { undoRef.current = undo; }, [undo]);
  useEffect(() => { redoRef.current = redo; }, [redo]);
  useEffect(() => { selectAllRef.current = selectAll; }, [selectAll]);
  useEffect(() => { deselectAllRef.current = deselectAll; }, [deselectAll]);

  // Prevent browser context menu on canvas area
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.react-flow__pane') || target.closest('.react-flow__renderer')) {
        e.preventDefault();
      }
    };
    document.addEventListener('contextmenu', handler, true);
    return () => document.removeEventListener('contextmenu', handler, true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing) return;

      const target = e.target as HTMLElement;
      const tag = target.tagName.toLowerCase();
      const isEditing = tag === 'input' || tag === 'textarea' || target.isContentEditable;

      // Copy (global)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        copyRef.current();
        return;
      }

      // Esc closes help panel first, then deselects
      if (e.key === 'Escape') {
        if (createMenu) {
          e.preventDefault();
          setCreateMenu(null);
          setTempLine(null);
          return;
        }
        if (showHelp) {
          e.preventDefault();
          setShowHelp(false);
          return;
        }
      }

      // Canvas shortcuts (skip when editing text)
      if (isEditing) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteRef.current();
        return;
      }

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redoRef.current();
        } else {
          undoRef.current();
        }
        return;
      }

      // Select All
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        selectAllRef.current();
        return;
      }

      // Escape deselects
      if (e.key === 'Escape') {
        e.preventDefault();
        deselectAllRef.current();
        return;
      }

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const step = 40 / zoomRef.current;
        const current = getViewport();
        let dx = 0;
        let dy = 0;
        if (e.key === 'ArrowUp') dy = step;
        if (e.key === 'ArrowDown') dy = -step;
        if (e.key === 'ArrowLeft') dx = step;
        if (e.key === 'ArrowRight') dx = -step;
        setViewport({ x: current.x + dx, y: current.y + dy, zoom: current.zoom }, { duration: 0 });
        return;
      }

      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        const current = getViewport();
        setViewport({ ...current, zoom: Math.min(current.zoom * 1.15, CANVAS_MAX_ZOOM) }, { duration: 0 });
        return;
      }

      if (e.key === '-') {
        e.preventDefault();
        const current = getViewport();
        setViewport({ ...current, zoom: Math.max(current.zoom / 1.15, CANVAS_MIN_ZOOM) }, { duration: 0 });
        return;
      }

      if (e.key === '0' || e.key === 'f' || e.key === 'F' || e.key === '1') {
        e.preventDefault();
        fitView({ duration: 400 });
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [createMenu, getViewport, setViewport, fitView, showHelp]);

  // ─── Drag & Drop State ───
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadToast, setUploadToast] = useState<{ msg: string; type: 'loading' | 'success' } | null>(null);
  const dragLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPointerPositionRef = useRef<{ x: number; y: number } | null>(null);

  // ─── Toolbar State ───
  const [showMinimap, setShowMinimap] = useState(false);
  const [snapGrid, setSnapGrid] = useState(false);
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const onViewportChange = useCallback((v: { x: number; y: number; zoom: number }) => {
    setZoom(v.zoom);
  }, []);

  const handleReset = useCallback(() => {
    fitView({ duration: 400 });
  }, [fitView]);

  const addNode = useCallback(
    (type: string, pos?: { x: number; y: number }, customLabel?: string) => {
      const position = pos || { x: 400 + Math.random() * 100, y: 200 + Math.random() * 100 };
      const baseTitle = type === 'text'
        ? NODE_BASE_TITLES.text
        : customLabel || NODE_BASE_TITLES[type] || type;
      const label = getNextNodeTitle(getAllNodeLabels(), baseTitle);
      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: {
          label,
          ...(type === 'image' ? getRoleData(null) : {}),
          ...(type === 'upscale' ? UPSCALE_NODE_DEFAULTS : {}),
          ...(type === 'text'
            ? {
                title: label,
                content: '',
                text: '',
                status: 'empty',
                referencedImageNodeIds: [],
                referencedTextNodeIds: [],
                outputTargetImageNodeIds: [],
                activeModel: DEFAULT_TEXT_NODE_MODEL,
                lastActionType: null,
                editorInput: '',
                textMode: 'unset',
              }
            : {}),
        },
      };
      setNodes((nds) => [...nds, newNode]);
      setContextMenu(null);
    },
    [setNodes, getAllNodeLabels],
  );

  const selectedTextNode = useMemo(() => {
    const selectedNodes = nodes.filter((node) => node.selected);
    if (selectedNodes.length !== 1 || selectedNodes[0].type !== 'text') return null;
    return selectedNodes[0];
  }, [nodes]);
  const selectedTextNodeImageReferences = useMemo<TextNodeImageReference[]>(() => {
    if (!selectedTextNode) return [];

    return edges
      .filter((edge) => edge.target === selectedTextNode.id)
      .flatMap((edge) => {
        const sourceNode = nodes.find((node) => node.id === edge.source);
        if (sourceNode?.type !== 'image') return [];

        return [{
          nodeId: sourceNode.id,
          title: String(sourceNode.data.label || '图片节点'),
          imageUrl: getCurrentImage(sourceNode.data),
        }];
      });
  }, [edges, nodes, selectedTextNode]);
  const selectedTextNodeTextReferences = useMemo<TextReferenceInfo[]>(() => {
    if (!selectedTextNode) return [];

    return edges
      .filter((edge) => edge.target === selectedTextNode.id)
      .flatMap((edge) => {
        const sourceNode = nodes.find((node) => node.id === edge.source);
        if (sourceNode?.type !== 'text') return [];

        const sourceData = sourceNode.data as TextNodeData;
        return [{
          nodeId: sourceNode.id,
          title: String(sourceData.label || sourceData.title || '文本节点'),
          content: getTextContent(sourceData),
          status: sourceData.status || 'empty',
        }];
      });
  }, [edges, nodes, selectedTextNode]);
  const selectedTextNodeSubmitState = useMemo(() => {
    if (!selectedTextNode) return null;
    const inputSources = edges
      .filter((edge) => edge.target === selectedTextNode.id)
      .map((edge) => nodes.find((node) => node.id === edge.source))
      .filter((node): node is Node => Boolean(node));
    return getTextNodeSubmitState(selectedTextNode.data, inputSources);
  }, [edges, nodes, selectedTextNode]);
  const updateSelectedTextNode = useCallback((patch: Partial<TextNodeData>) => {
    if (!selectedTextNode) return;
    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === selectedTextNode.id
          ? { ...node, data: { ...node.data, ...patch } }
          : node,
      ),
    );
  }, [selectedTextNode, setNodes]);

  const submitSelectedTextNode = useCallback(async () => {
    if (!selectedTextNode) return;
    const nodeData = selectedTextNode.data as TextNodeData;
    const incomingEdges = edges.filter((edge) => edge.target === selectedTextNode.id);
    const inputSources = incomingEdges
      .map((edge) => nodes.find((node) => node.id === edge.source))
      .filter((node): node is Node => Boolean(node));
    const submitState = getTextNodeSubmitState(nodeData, inputSources);
    if (!submitState.canSubmit) return;

    const instruction = getTextNodeInstruction(nodeData);
    const referencedTextNodes = inputSources
      .filter((node) => node.type === 'text');
    const referencedImageNode = inputSources
      .find((node) => node?.type === 'image' && Boolean(getCurrentImage(node.data)));
    const sourceText = referencedTextNodes
      .map((node) => getTextNodeInstruction(node.data))
      .filter(Boolean)
      .join('\n\n');
    const effectiveInstruction = instruction || (
      submitState.hasInputContent
        ? '基于左侧输入内容生成建筑可视化图像'
        : ''
    );
    const action = nodeData.lastActionType === 'image_to_text'
      ? 'image_to_text'
      : sourceText
        ? 'text_to_text'
        : nodeData.lastActionType || 'draft';

    updateSelectedTextNode({ isProcessing: true, status: 'editing', lastActionType: action });
    try {
      const result = await simulateTextNodeResult({
        action,
        instruction: effectiveInstruction,
        sourceText,
        sourceImageTitle: referencedImageNode
          ? String(referencedImageNode.data.label || '图片节点')
          : undefined,
      });
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === selectedTextNode.id
            ? {
                ...node,
                data: {
                  ...node.data,
                  content: result,
                  text: result,
                  status: 'result',
                  isProcessing: false,
                  editorInput: '',
                },
              }
            : node,
        ),
      );
    } catch {
      updateSelectedTextNode({ isProcessing: false });
    }
  }, [edges, nodes, selectedTextNode, setNodes, updateSelectedTextNode]);

  function isEditablePasteTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    const tagName = target.tagName.toLowerCase();
    return (
      tagName === 'input' ||
      tagName === 'textarea' ||
      target.isContentEditable ||
      Boolean(target.closest('[contenteditable="true"]')) ||
      Boolean(target.closest('[data-paste-ignore="true"]'))
    );
  }

  function formatPastedImageLabel(file: File): string {
    if (file.name && file.name !== 'image.png') {
      return file.name.replace(/\.[^/.]+$/, '');
    }
    return 'pasted-image';
  }

  function isAcceptedImageFile(file: File): boolean {
    if (ACCEPTED_IMAGE_UPLOAD_TYPES.has(file.type)) return true;
    const name = file.name.toLowerCase();
    return (
      name.endsWith('.png') ||
      name.endsWith('.jpg') ||
      name.endsWith('.jpeg') ||
      name.endsWith('.webp') ||
      name.endsWith('.gif')
    );
  }

  function getFilesFromClipboard(clipboardData: DataTransfer): File[] {
    const filesFromItems = Array.from(clipboardData.items ?? [])
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);

    const filesFromFiles = Array.from(clipboardData.files ?? []);

    const seen = new Set<string>();
    const files: File[] = [];
    for (const file of [...filesFromItems, ...filesFromFiles]) {
      const key = `${file.name}-${file.size}-${file.type}-${file.lastModified}`;
      if (!seen.has(key)) {
        seen.add(key);
        files.push(file);
      }
    }

    return files;
  }

  const createImageNodesFromFiles = useCallback(
    (files: File[], basePosition: { x: number; y: number }) => {
      const rejectedFiles: ImageFileReject[] = [];

      const validFiles = files.filter((file) => {
        if (!isAcceptedImageFile(file)) {
          rejectedFiles.push({ file, reason: 'unsupported-type' });
          console.warn(`[Canvas] Skipped unsupported image: ${file.name || 'unnamed'} (type: ${file.type || 'unknown'})`);
          return false;
        }
        if (file.size > MAX_IMAGE_UPLOAD_SIZE) {
          rejectedFiles.push({ file, reason: 'too-large' });
          console.warn(
            `[Canvas] Skipped oversized image: ${file.name || 'unnamed'} (${(file.size / 1024 / 1024).toFixed(1)}MB > 10MB)`,
          );
          return false;
        }
        return true;
      });

      const preCheckMessage = getImageRejectMessage(rejectedFiles, validFiles.length);
      if (validFiles.length === 0) {
        if (preCheckMessage) showToast(preCheckMessage);
        return;
      }

      setUploadToast({ msg: t('canvas.uploading'), type: 'loading' });

      const allLabels = getAllNodeLabels();
      const assignedLabels: string[] = [];
      const fileFinalLabels = validFiles.map((file) => {
        const baseTitle = formatPastedImageLabel(file);
        const label = getNextNodeTitle([...allLabels, ...assignedLabels], baseTitle);
        assignedLabels.push(label);
        return label;
      });

      Promise.all(
        validFiles.map((file, index) => {
          return new Promise<{ node: Node; index: number } | null>((resolve) => {
            const url = URL.createObjectURL(file);
            objectUrlsRef.current.add(url);
            const imgEl = new window.Image();
            imgEl.onload = () => {
              const offsetX = index * 40;
              const offsetY = index * 40;
              const position = { x: basePosition.x + offsetX, y: basePosition.y + offsetY };
              const newNode: Node = {
                id: `image-${Date.now()}-${index}`,
                type: 'image',
                position,
                data: {
                  label: fileFinalLabels[index],
                  image: url,
                  inputImage: url,
                  currentImage: url,
                  currentResultId: null,
                  width: imgEl.naturalWidth,
                  height: imgEl.naturalHeight,
                  ...getRoleData(null),
                },
                selected: index === 0,
              };
              resolve({ node: newNode, index });
            };
            imgEl.onerror = () => {
              URL.revokeObjectURL(url);
              objectUrlsRef.current.delete(url);
              rejectedFiles.push({ file, reason: 'decode-failed' });
              console.warn(`[Canvas] Failed to decode image: ${file.name || 'unnamed'}`);
              resolve(null);
            };
            imgEl.src = url;
          });
        }),
      ).then((results) => {
        const newNodes = results
          .filter((result): result is { node: Node; index: number } => Boolean(result))
          .map((r) => r.node);

        if (newNodes.length === 0) {
          setUploadToast(null);
          const finalMessage = getImageRejectMessage(rejectedFiles, newNodes.length);
          if (finalMessage) showToast(finalMessage);
          return;
        }

        setNodes((nds) => [
          ...nds.map((n) => ({ ...n, selected: false })),
          ...newNodes,
        ]);
        setUploadToast({ msg: t('canvas.uploadSuccess'), type: 'success' });
        setTimeout(() => setUploadToast(null), 2500);

        if (rejectedFiles.length > 0) {
          const partialMessage = getImageRejectMessage(rejectedFiles, newNodes.length);
          if (partialMessage) showToast(partialMessage);
        }
      });
    },
    [setNodes, t, showToast],
  );

  const handleDropFiles = useCallback(
    (files: FileList, screenX: number, screenY: number) => {
      const basePos = screenToFlowPosition({ x: screenX, y: screenY });
      createImageNodesFromFiles(Array.from(files), basePos);
    },
    [screenToFlowPosition, createImageNodesFromFiles],
  );

  const handlePaste = useCallback(
    (event: ClipboardEvent) => {
      if (isEditablePasteTarget(event.target)) return;

      const clipboardData = event.clipboardData;
      if (!clipboardData) return;

      const clipboardFiles = getFilesFromClipboard(clipboardData);

      if (clipboardFiles.length > 0) {
        event.preventDefault();
        const pastePoint = lastPointerPositionRef.current || {
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        };
        const centerPos = screenToFlowPosition({
          x: pastePoint.x,
          y: pastePoint.y,
        });
        createImageNodesFromFiles(clipboardFiles, centerPos);
        return;
      }

      if (clipboardRef.current.length > 0) {
        event.preventDefault();
        pasteNodes();
      }
    },
    [screenToFlowPosition, createImageNodesFromFiles, pasteNodes],
  );

  useEffect(() => {
    const handler = (e: ClipboardEvent) => handlePaste(e);
    window.addEventListener('paste', handler);
    return () => window.removeEventListener('paste', handler);
  }, [handlePaste]);

  useEffect(() => {
    const updatePointerPosition = (event: PointerEvent) => {
      lastPointerPositionRef.current = { x: event.clientX, y: event.clientY };
    };
    window.addEventListener('pointermove', updatePointerPosition, true);
    window.addEventListener('pointerdown', updatePointerPosition, true);
    return () => {
      window.removeEventListener('pointermove', updatePointerPosition, true);
      window.removeEventListener('pointerdown', updatePointerPosition, true);
    };
  }, []);

  // ─── Canvas Stage Handlers ───
  const handleCanvasContextMenu = useCallback((e: React.MouseEvent) => {
    if (isDrawingRef.current) { e.preventDefault(); return; }
    const target = e.target as HTMLElement;
    if (target.closest('.react-flow__node')) return;
    e.preventDefault();
    setNodeContextMenu(null);
    const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    setContextMenu({ x: e.clientX, y: e.clientY, flowPos: pos });
  }, [screenToFlowPosition]);

  const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
    if (
      e.dataTransfer.types.includes('application/x-visioner-reference-reorder') ||
      !e.dataTransfer.types.includes('Files')
    ) {
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (dragLeaveTimer.current) clearTimeout(dragLeaveTimer.current);
    setIsDragOver(true);
  }, []);

  const handleCanvasDragLeave = useCallback(() => {
    if (dragLeaveTimer.current) clearTimeout(dragLeaveTimer.current);
    dragLeaveTimer.current = setTimeout(() => setIsDragOver(false), 50);
  }, []);

  const handleCanvasDrop = useCallback((e: React.DragEvent) => {
    if (
      e.dataTransfer.types.includes('application/x-visioner-reference-reorder') ||
      !e.dataTransfer.types.includes('Files')
    ) {
      setIsDragOver(false);
      return;
    }
    e.preventDefault();
    setIsDragOver(false);
    handleDropFiles(e.dataTransfer.files, e.clientX, e.clientY);
  }, [handleDropFiles]);

  const handleEdgeClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    setEdges((eds) => eds.map((e) => ({ ...e, selected: e.id === edge.id })));
    setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
  }, [setEdges, setNodes]);

  const handlePaneClick = useCallback(() => {
    setCreateMenu(null);
    setTempLine(null);
    setEdges((eds) => eds.map((e) => ({ ...e, selected: false })));
    setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
  }, [setEdges, setNodes]);

  const handleDragOverCapture = useCallback((event: React.DragEvent) => {
    if (event.dataTransfer.types.includes('application/x-visioner-reference-reorder')) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, []);

  const handleDropCapture = useCallback((event: React.DragEvent) => {
    if (event.dataTransfer.types.includes('application/x-visioner-reference-reorder')) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, []);

  // ─── Context Menu Handlers ───
  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleCloseCreateMenu = useCallback(() => {
    setContextMenu(null);
    setNodeContextMenu(null);
    setCreateMenu(null);
    setTempLine(null);
  }, []);

  const handleCloseNodeContextMenu = useCallback(() => {
    setContextMenu(null);
    setNodeContextMenu(null);
  }, []);

  const handleContextMenuReopen = useCallback((clientX: number, clientY: number) => {
    const pos = screenToFlowPosition({ x: clientX, y: clientY });
    setContextMenu({ x: clientX, y: clientY, flowPos: pos });
  }, [screenToFlowPosition]);

  const handleNodeContextMenuReopen = useCallback((clientX: number, clientY: number) => {
    if (!nodeContextMenu) return;
    setNodeContextMenu({ x: clientX, y: clientY, nodeId: nodeContextMenu.nodeId });
  }, [nodeContextMenu]);

  const handleContextMenuAddNode = useCallback((type: string, label: string) => {
    if (!contextMenu) return;
    addNode(type, contextMenu.flowPos, label);
  }, [contextMenu, addNode]);

  const handleCreateAndConnect = useCallback((type: string) => {
    if (!createMenu) return;
    if (!['text', 'image', 'video'].includes(type)) {
      setCreateMenu(null);
      setTempLine(null);
      return;
    }
    const timestamp = Date.now();
    const newNodeId = `${type}-${timestamp}`;
    const baseTitle = NODE_BASE_TITLES[type] || type;
    const label = getNextNodeTitle(getAllNodeLabels(), baseTitle);
    const newNode: Node = {
      id: newNodeId,
      type,
      position: createMenu.flowPos,
      data: {
        label,
        ...(type === 'image' ? getRoleData(null) : {}),
        ...(type === 'text'
          ? {
              title: label,
              content: '',
              text: '',
              status: 'empty',
              referencedImageNodeIds: [],
              referencedTextNodeIds: [],
              outputTargetImageNodeIds: [],
              activeModel: DEFAULT_TEXT_NODE_MODEL,
              lastActionType: null,
              editorInput: '',
              textMode: 'unset',
            }
          : {}),
      },
    };
    const startsFromSource = createMenu.sourceHandleType === 'source';
    const newEdge: Edge = {
      id: `e-${timestamp}`,
      source: startsFromSource ? createMenu.sourceNodeId : newNodeId,
      target: startsFromSource ? newNodeId : createMenu.sourceNodeId,
      sourceHandle: startsFromSource ? createMenu.sourceHandleId : 'right-source',
      targetHandle: startsFromSource ? 'left-target' : createMenu.sourceHandleId,
      style: { stroke: '#555', strokeWidth: 1 },
    };
    setNodes((nds) => [...nds, newNode]);
    setEdges((eds) => [...eds, newEdge]);
    setCreateMenu(null);
    setTempLine(null);
  }, [createMenu, getAllNodeLabels, setNodes, setEdges]);

  const handleNodeDelete = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
  }, [setNodes]);

  // ─── Toolbar Handlers ───
  const handleZoomChange = useCallback((value: number) => {
    const current = getViewport();
    const nextZoom = Math.min(Math.max(value, CANVAS_MIN_ZOOM), CANVAS_MAX_ZOOM);
    setViewport({ x: current.x, y: current.y, zoom: nextZoom }, { duration: 0 });
  }, [getViewport, setViewport]);

  useEffect(() => {
    const selectedTextNode = nodes.find((node) => node.selected && node.type === 'text');
    if (!selectedTextNode) {
      setTextNodePanelPosition(null);
      return;
    }

    const updatePosition = () => {
      const nodeEl = document.querySelector(`.react-flow__node[data-id="${selectedTextNode.id}"] .node-preview-card`) as HTMLElement | null;
      if (!nodeEl) return;
      const rect = nodeEl.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const left = rect.left + rect.width / 2;
      const top = rect.bottom + 12;
      setTextNodePanelPosition((prev) =>
        prev?.left === left && prev?.top === top ? prev : { left, top },
      );
    };

    updatePosition();
    let frameId = window.requestAnimationFrame(function tick() {
      updatePosition();
      frameId = window.requestAnimationFrame(tick);
    });

    const nodeEl = document.querySelector(`.react-flow__node[data-id="${selectedTextNode.id}"] .node-preview-card`) as HTMLElement | null;
    const observer = nodeEl ? new ResizeObserver(updatePosition) : null;
    if (nodeEl && observer) observer.observe(nodeEl);

    window.addEventListener('resize', updatePosition);
    return () => {
      window.cancelAnimationFrame(frameId);
      observer?.disconnect();
      window.removeEventListener('resize', updatePosition);
    };
  }, [nodes]);

  const handleUseNodeHistoryImages = useCallback((images: GeneratedImage[], sourceBatch?: ResultSetBatch) => {
    if (!historyPanelNodeId || images.length === 0) return;

    const selectedImage = images[0];
    const generatedNodeData = createGeneratedNodeDataFromHistoryImage(selectedImage, sourceBatch);
    setNodes((nds) =>
      nds.map((node) =>
        node.id === historyPanelNodeId
          ? {
              ...node,
              data: {
                ...node.data,
                ...generatedNodeData,
              },
            }
          : node,
      ),
    );
  }, [historyPanelNodeId, setNodes]);

  const handleUseGlobalHistoryImages = useCallback((images: GeneratedImage[], sourceBatch?: ResultSetBatch, sourceBatches?: ResultSetBatch[]) => {
    if (images.length === 0) return;

    const viewportCenter = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    const currentZoom = getViewport().zoom || 1;
    const spacingX = 260 / currentZoom;
    const spacingY = 240 / currentZoom;
    const columns = Math.ceil(Math.sqrt(images.length));
    const rows = Math.ceil(images.length / columns);
    const existingLabels = getAllNodeLabels();
    const nextLabels: string[] = [];
    const timestamp = Date.now();

    const newNodes: Node[] = images.map((image, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const label = getNextNodeTitle([...existingLabels, ...nextLabels], NODE_BASE_TITLES.image);
      nextLabels.push(label);

      return {
        id: `image-history-${timestamp}-${index}`,
        type: 'image',
        position: {
          x: viewportCenter.x + (col - (columns - 1) / 2) * spacingX,
          y: viewportCenter.y + (row - (rows - 1) / 2) * spacingY,
        },
        data: {
          label,
          ...createGeneratedNodeDataFromHistoryImage(
            image,
            getHistoryBatchForImage(image, sourceBatches || (sourceBatch ? [sourceBatch] : [])) || sourceBatch,
          ),
          ...getRoleData(null),
        },
        selected: index === images.length - 1,
      };
    });

    setNodes((nds) => [
      ...nds.map((node) => ({ ...node, selected: false })),
      ...newNodes,
    ]);
  }, [getAllNodeLabels, getViewport, screenToFlowPosition, setNodes]);

  return (
    <div className="fixed inset-0 h-screen w-screen overflow-hidden" style={{ background: '#000' }}>
      <GlobalDropForwarder />
      <Navbar variant="canvas" projectName={projectName} />

      {/* Global style overrides */}
      <style>{`
        .react-flow__node {
          transition: box-shadow 200ms ease;
        }
        .react-flow__attribution {
          display: none !important;
        }
        /* Image node handles — hidden by default, shown on hover or when selected */
        .image-node-handle {
          opacity: 0;
          transition: opacity 200ms ease;
          pointer-events: auto;
          cursor: crosshair;
        }
        .react-flow__node:hover .image-node-handle,
        .react-flow__node.selected .image-node-handle,
        .image-node-handle:hover {
          opacity: 1;
        }
        .node-preview-card {
          box-sizing: border-box;
          border-style: solid !important;
          border-width: 2.5px !important;
          border-color: rgba(42, 42, 53, 0.98) !important;
          box-shadow: none !important;
          filter: none !important;
        }
        .react-flow__node.selected .node-preview-card {
          border-color: #2f6bff !important;
          box-shadow: none !important;
          filter: none !important;
        }
        .image-role-tag-button:hover {
          border-color: rgba(0,212,255,0.62) !important;
          color: #ffffff !important;
        }
        /* Edge colors — gray by default, cyan when selected */
        .react-flow__edge-path {
          stroke: #555;
          stroke-width: 1;
        }
        .react-flow__edge.selected .react-flow__edge-path {
          stroke: #00d4ff !important;
          stroke-width: 2px !important;
          filter: drop-shadow(0 0 6px rgba(0,212,255,0.6));
        }
        /* Hide default edge markers if any */
        .react-flow__edge .react-flow__edge-interaction {
          stroke: transparent;
        }
        /* Hide the persistent selection rect around selected nodes after box selection */
        .react-flow__nodesselection-rect {
          border: none !important;
          background: transparent !important;
        }
        /* Connection hover feedback on nodes */
        .react-flow__node.can-connect {
          box-shadow: none !important;
        }
        .react-flow__node.can-connect .node-preview-card {
          border-color: #2f6bff !important;
          box-shadow: none !important;
        }
        .react-flow__node.cannot-connect {
          box-shadow: none !important;
        }
        .react-flow__node.cannot-connect .node-preview-card {
          border-color: #ff4444 !important;
          box-shadow: none !important;
        }
      `}</style>

      <CanvasStage
        tempLine={tempLine}
        isDragOver={isDragOver}
        rejectTooltip={rejectTooltip}
        uploadToast={uploadToast}
        nodesWithCallbacks={nodesWithCallbacks}
        edges={edges}
        snapGrid={snapGrid}
        showMinimap={showMinimap}
        onContextMenu={handleCanvasContextMenu}
        onDragOver={handleCanvasDragOver}
        onDragLeave={handleCanvasDragLeave}
        onDrop={handleCanvasDrop}
        onNodesChange={onNodesChange}
        onNodeContextMenu={onNodeContextMenu}
        onViewportChange={onViewportChange}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        onSelectionStart={onSelectionStart}
        onSelectionEnd={onSelectionEnd}
        onDragOverCapture={handleDragOverCapture}
        onDropCapture={handleDropCapture}
      />

      <CanvasSidebar
        activePanel={activePanel}
        onSetActivePanel={setActivePanel}
        onAddNode={addNode}
        onUseHistoryImages={handleUseGlobalHistoryImages}
      />

      {selectedTextNode && (selectedTextNode.data as TextNodeData).textMode !== 'compose' && (
        <div
          className="absolute z-[90]"
          style={{
            top: textNodePanelPosition?.top ?? 0,
            left: textNodePanelPosition?.left ?? 0,
            width: IMAGE_NODE_CONTROL_WIDTH,
            transform: `translateX(-50%) scale(${IMAGE_NODE_CONTROL_SCALE})`,
            transformOrigin: 'top center',
          }}
        >
          <TextNodeInputPanel
            value={String(selectedTextNode.data.editorInput || '')}
            model={(selectedTextNode.data.activeModel as TextNodeModel | undefined) || DEFAULT_TEXT_NODE_MODEL}
            isProcessing={selectedTextNodeSubmitState?.isProcessing ?? false}
            canSubmit={selectedTextNodeSubmitState?.canSubmit ?? false}
            focusRequestId={textFocusRequestId}
            textReferences={selectedTextNodeTextReferences}
            imageReferences={selectedTextNodeImageReferences}
            onChange={(value) => updateSelectedTextNode({ editorInput: value, status: 'editing' })}
            onModelChange={(model) => updateSelectedTextNode({ activeModel: model })}
            onSubmit={submitSelectedTextNode}
            onFocusTextReference={focusCanvasNode}
            onFocusImageReference={focusCanvasNode}
            onRemoveTextReference={(sourceNodeId) => {
              removeReferenceEdge(selectedTextNode.id, sourceNodeId);
            }}
            onRemoveImageReference={(sourceNodeId) => {
              removeReferenceEdge(selectedTextNode.id, sourceNodeId);
            }}
          />
        </div>
      )}

      {/* Node history floating panel */}
      {historyPanelNodeId && (
        <div
          className="fixed z-[100] rounded-xl overflow-hidden shadow-2xl"
          style={{
            right: 20,
            top: 72,
            width: 320,
            height: 480,
            background: '#252526',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <HistoryPanel
            scope="node"
            nodeId={historyPanelNodeId}
            onClose={() => setHistoryPanelNodeId(null)}
            onUseImages={handleUseNodeHistoryImages}
          />
        </div>
      )}

      <CanvasContextMenus
        contextMenu={contextMenu}
        onCloseContextMenu={handleCloseContextMenu}
        onContextMenuAddNode={handleContextMenuAddNode}
        onContextMenuReopen={handleContextMenuReopen}
        createMenu={createMenu}
        onCloseCreateMenu={handleCloseCreateMenu}
        onCreateAndConnect={handleCreateAndConnect}
        nodeContextMenu={nodeContextMenu}
        onCloseNodeContextMenu={handleCloseNodeContextMenu}
        onNodeContextMenuReopen={handleNodeContextMenuReopen}
        onNodeDuplicate={duplicateNode}
        onNodePaste={pasteNodes}
        onNodeDelete={handleNodeDelete}
        onNodeCopy={copyNodes}
      />

      {/* Toast */}
      {toastMsg && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-xs font-medium animate-in fade-in slide-in-from-top-2"
          style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
          {toastMsg}
        </div>
      )}

      <CanvasToolbar
        showMinimap={showMinimap}
        onToggleMinimap={() => setShowMinimap((v) => !v)}
        snapGrid={snapGrid}
        onToggleSnapGrid={() => setSnapGrid((v) => !v)}
        zoom={zoom}
        onZoomChange={handleZoomChange}
        onReset={handleReset}
        showHelp={showHelp}
        onToggleHelp={() => setShowHelp((v) => !v)}
      />
    </div>
  );
}

/* ─── Page-level cleanup: revoke all registered objectURLs on unmount ─── */
function useRevokeObjectUrlsOnUnmount(objectUrlsRef: React.RefObject<Set<string> | null>) {
  useEffect(() => {
    return () => {
      if (!objectUrlsRef.current) return;
      objectUrlsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore already-revoked or invalid URLs
        }
      });
      objectUrlsRef.current.clear();
    };
  }, [objectUrlsRef]);
}

/* ─── Wrapper ─── */

export default function CanvasPage() {
  return (
    <HistoryProvider>
      <ReactFlowProvider>
        <FlowCanvas />
      </ReactFlowProvider>
    </HistoryProvider>
  );
}
