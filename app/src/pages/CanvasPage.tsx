import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  useNodesState,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type NodeChange,
  type OnNodeDrag,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import { getProjectCanvasData, recentProjects } from '../data/siteData';
import { useToast } from '../features/canvas/hooks/useToast';
import { useCanvasKeyboardShortcuts } from '../features/canvas/hooks/useCanvasKeyboardShortcuts';
import { useCanvasSelectionActions } from '../features/canvas/hooks/useCanvasSelectionActions';
import { useCanvasViewport } from '../features/canvas/hooks/useCanvasViewport';
import { useCanvasDragDrop } from '../features/canvas/hooks/useCanvasDragDrop';
import { useCanvasUiPanels } from '../features/canvas/hooks/useCanvasUiPanels';
import { useTextNodeFloatingPanelPosition } from '../features/canvas/hooks/useTextNodeFloatingPanelPosition';
import { useCanvasUndoRedo } from '../features/canvas/hooks/useCanvasUndoRedo';
import { useCanvasImageImport } from '../features/canvas/hooks/useCanvasImageImport';
import { useCanvasNodeClipboard } from '../features/canvas/hooks/useCanvasNodeClipboard';
import type { ImageRole, LocalReferencePoint, PromptContent } from '../features/canvas/types/imageNode.types';
import { getImageRoleLabel } from '../features/canvas/constants/imageUsages';
import { CANVAS_MAX_ZOOM, CANVAS_MIN_ZOOM, CANVAS_NODE_CONTROL_SCALE as IMAGE_NODE_CONTROL_SCALE, DEFAULT_MODEL_PARAMS, IMAGE_CROP_CANCEL_EVENT, IMAGE_NODE_CONTROL_WIDTH, IMAGE_NODE_PREVIEW_WIDTH } from '../features/canvas/constants/canvasConstants';
import { getRoleData } from '../features/canvas/utils/referenceUtils';
import { formatReferenceLimitIssue } from '../features/canvas/utils/referenceLimits';
import { getNextCopiedNodeTitle, getNextNodeTitle } from '../features/canvas/utils/nodeNaming';
import { prepareCanvasNodeDataForCopy } from '../features/canvas/utils/nodeCopyData';
import {
  formatPastedImageLabel,
  getImageRejectMessage,
  type ImageFileReject,
} from '../features/canvas/utils/canvasFileUtils';
import {
  buildUploadedImageNode,
  decodeImageFile,
  filterImageImportFiles,
} from '../features/canvas/utils/canvasImageImportUtils';
import { HistoryProvider } from '../features/canvas/contexts/HistoryContext';
import { HistoryPanel } from '../features/canvas/components/HistoryPanel';
import type { GeneratedImage, ResultSetBatch } from '../features/canvas/types/history.types';
import type { GenerationHistoryItem, GenerationTask } from '../features/canvas/types/generation.types';
import type { ExteriorRenderRequest, ExteriorRenderResult } from '../features/canvas/nodes/ExteriorRenderNode/exteriorRender.types';
import {
  buildExteriorRenderCompletedOutput,
  buildExteriorRenderFailedOutput,
  buildExteriorRenderProcessingOutput,
} from '../features/canvas/nodes/ExteriorRenderNode/exteriorRenderResultGraph';
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
import { CanvasImageMarkCaptureLayer } from '../features/canvas/components/CanvasImageMarkCaptureLayer';
import { CanvasSidebar } from '../features/canvas/components/CanvasSidebar';
import { CanvasContextMenus } from '../features/canvas/components/CanvasContextMenus';
import { CanvasToolbar } from '../features/canvas/components/CanvasToolbar';
import { CanvasFlowStyles } from '../features/canvas/components/CanvasFlowStyles';
import { CanvasToast } from '../features/canvas/components/CanvasToast';
import {
  TextNodeInputPanel,
  type TextNodeImageReference,
} from '../features/canvas/components/TextNodeInputPanel';
import {
  DEFAULT_TEXT_NODE_MODEL,
  TEXT_NODE_IMAGE_EXTRACTION_PROMPT_KEY,
  TEXT_NODE_WIDTH,
} from '../features/canvas/constants/textNode';
import {
  getTextContent,
  getTextNodeInstruction,
  getTextNodeSubmitState,
  isComposeTextNode,
  removeComposeTextInputEdges,
  simulateTextNodeResult,
} from '../features/canvas/utils/textNodeUtils';
import { getCurrentImage } from '../features/canvas/types/imageNodeData.types';
import { resolveNodeImage } from '../features/canvas/utils/resolveNodeImage';
import {
  CREATE_NODE_MENU_TOP_OFFSET,
  CREATE_NODE_MENU_VIEWPORT_PADDING,
  CREATE_NODE_MENU_WIDTH,
} from '../features/canvas/constants/basicNodes';
import { NODE_BASE_TITLES } from '../features/canvas/constants/canvasNodeTitles';
import {
  createBasicCanvasNode,
  createCompareCanvasNode,
  createRelightCanvasNode,
  createSunSkyCanvasNode,
  createUpscaleCanvasNode,
} from '../features/canvas/utils/canvasNodeFactories';
import { ConnectionEngine } from '../features/canvas/connection/ConnectionEngine';
import { buildConnectionValidationInput } from '../features/canvas/connection/buildConnectionValidationInput';
import { validateConnectionRules, type ConnectionRuleMessages } from '../features/canvas/connection/connectionRules';
import type { ConnectionValidationResult } from '../features/canvas/connection/connectionTypes';
import {
  getCompareEdgesBySlot,
  getNextCompareSlot,
  normalizeCompareEdgeSlots,
} from '../features/canvas/utils/compareSlots';

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
    controller: batch?.controller,
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
    controller: batch?.controller,
    finalPrompt: prompt,
    userPrompt,
    references: [],
    imageReferences: inputRefs,
    referenceImages: inputRefs,
    modelParams,
    lightPreview,
    currentResultSource: 'history',
    assetSource: 'history',
    isGeneratedResult: true,
    generationStatus: 'completed',
    width: image.width,
    height: image.height,
  };
}

function isProcessingImageNode(node: Node) {
  if (node.type !== 'image') return false;
  const generationTask = node.data.generationTask as GenerationTask | null | undefined;
  return generationTask?.status === 'running' || Boolean(node.data.isGenerating || node.data.isProcessing);
}

function getPromptReferenceSourceNodeIds(data: Node['data']) {
  const promptContent = Array.isArray(data.promptContent) ? (data.promptContent as PromptContent[]) : [];
  return promptContent.flatMap((block) => (
    (block.type === 'image_reference' || block.type === 'image_mark_reference') && block.sourceNodeId
      ? [block.sourceNodeId]
      : []
  ));
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
  const { screenToFlowPosition, setViewport, getViewport, getNodes, fitView } = useReactFlow();
  const { msg: toastMsg, show: showToast } = useToast();
  const lastPointerPositionRef = useRef<{ x: number; y: number } | null>(null);

  const {
    activePanel, setActivePanel,
    showHelp, closeHelp, toggleHelp,
    showMinimap, toggleMinimap,
    snapGrid, toggleSnapGrid,
    contextMenu, openContextMenu, closeContextMenu,
    nodeContextMenu, openNodeContextMenu, closeNodeContextMenu,
    historyPanelNodeId, openHistoryPanel, closeHistoryPanel,
  } = useCanvasUiPanels();
  const [textFocusRequestId, setTextFocusRequestId] = useState(0);
  const [activeImageMarkTargetNodeId, setActiveImageMarkTargetNodeId] = useState<string | null>(null);
  const [activeImageMarkSourceNodeId, setActiveImageMarkSourceNodeId] = useState<string | null>(null);
  const [activeImageMarkSessionId, setActiveImageMarkSessionId] = useState<string | null>(null);
  const handleCanvasNodesChange = useCallback((changes: NodeChange[]) => {
    const effectiveChanges = activeImageMarkTargetNodeId
      ? changes.filter((change) => change.type !== 'select')
      : changes;
    onNodesChange(effectiveChanges);
  }, [activeImageMarkTargetNodeId, onNodesChange]);
  const runningTextTaskIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (activeImageMarkTargetNodeId && !nodes.some((node) => node.id === activeImageMarkTargetNodeId)) {
      setActiveImageMarkTargetNodeId(null);
      setActiveImageMarkSourceNodeId(null);
      setActiveImageMarkSessionId(null);
    }
  }, [activeImageMarkTargetNodeId, nodes]);
  const submitTextNodeRef = useRef<(
    nodeId: string,
    dataOverride?: Partial<TextNodeData>,
  ) => void>(() => undefined);

  // ─── Line Drawing State ───
  const [edges, setEdges] = useState<Edge[]>([]);
  const [tempLine, setTempLine] = useState<TempConnectionState | null>(null);
  const [createMenu, setCreateMenu] = useState<CreateConnectionMenuState | null>(null);
  const [rejectTooltip, setRejectTooltip] = useState<{ x: number; y: number; message: string } | null>(null);
  const isDrawingRef = useRef(false);
  const engine = useMemo(() => new ConnectionEngine(), []);

  useEffect(() => {
    setEdges((currentEdges) => normalizeCompareEdgeSlots(nodes, currentEdges));
  }, [edges, nodes, setEdges]);
  const connectionRuleMessages = useMemo<ConnectionRuleMessages>(() => ({
    wrongPortDirection: t('error.wrongPortDirection'),
    selfConnect: t('error.selfConnect'),
    cannotConnect: t('canvas.cannotConnect'),
    portTypeMismatch: t('error.portTypeMismatch'),
    cycleDetected: t('error.cycleDetected'),
    alreadyConnected: t('error.alreadyConnected'),
    relightMaxOneImage: t('error.relightMaxOneImage'),
    upscaleMaxOneImage: t('error.upscaleMaxOneImage'),
    compareMaxTwoImages: t('error.compareMaxTwoImages'),
    usageConflict: (role) => t('reference.validation.usageConflict', {
      role: getImageRoleLabel(role, undefined, undefined, undefined, (key) => t(key)),
    }),
    referenceLimit: (issue) => formatReferenceLimitIssue(
      issue,
      (key, values) => t(key, values),
    ),
  }), [t]);

  const validateImageProcessingEdge = useCallback((
    graphNodes: Node[],
    graphEdges: Edge[],
    edge: Pick<Edge, 'source' | 'target' | 'sourceHandle' | 'targetHandle'>,
  ) => validateConnectionRules(buildConnectionValidationInput({
    nodes: graphNodes,
    edges: graphEdges,
    sourceNodeId: edge.source,
    targetNodeId: edge.target,
    sourceHandle: { id: edge.sourceHandle || 'right-source', type: 'source', dataType: 'image' },
    targetHandle: { id: edge.targetHandle || 'left-target', type: 'target', dataType: 'image' },
    messages: connectionRuleMessages,
  })), [connectionRuleMessages]);

  const nodePositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  useEffect(() => {
    setEdges((currentEdges) => {
      const nextEdges = removeComposeTextInputEdges(currentEdges, nodes);
      return nextEdges.length === currentEdges.length ? currentEdges : nextEdges;
    });
  }, [nodes]);

  const startLineDraw = useCallback((
    nodeId: string,
    screenX: number,
    screenY: number,
    sourceHandleId = 'right-source',
    sourceHandleType: ConnectionHandleType = 'source',
  ) => {
    if (isDrawingRef.current) return;
    isDrawingRef.current = true;
    engine.dispatch({
      type: 'START',
      payload: {
        sourceNodeId: nodeId,
        sourceHandle: sourceHandleId,
        sourceType: sourceHandleType,
      },
    });
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
    ): ConnectionValidationResult => {
      if (!connection) {
        return {
          valid: false,
          code: 'same_handle_side',
          reason: t('error.wrongPortDirection'),
        };
      }

      const {
        sourceId,
        targetId,
        sourceHandle,
        targetHandle,
      } = connection;

      return validateConnectionRules(buildConnectionValidationInput({
        nodes,
        edges,
        sourceNodeId: sourceId,
        targetNodeId: targetId,
        sourceHandle: {
          id: connection.sourceHandleId,
          type: getHandleType(sourceHandle),
          dataType: sourceHandle.getAttribute('data-data-type'),
        },
        targetHandle: {
          id: connection.targetHandleId,
          type: getHandleType(targetHandle),
          dataType: targetHandle.getAttribute('data-data-type'),
        },
        messages: connectionRuleMessages,
      }));
    };

    const handleMouseMove = (e: PointerEvent) => {
      if (!isDrawingRef.current) return;
      engine.dispatch({ type: 'MOVE', payload: { x: e.clientX, y: e.clientY } });
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
        const validation: ConnectionValidationResult = targetId === nodeId
          ? { valid: false, code: 'same_node', reason: t('error.selfConnect') }
          : validateConnection(resolveConnection(targetId, hoveredHandle));
        const error = validation.valid ? null : validation.reason ?? t('canvas.cannotConnect');
        engine.dispatch({
          type: 'HIT_NODE',
          payload: {
            targetNodeId: targetId,
            targetHandle: hoveredHandle?.getAttribute('data-handle-id') ?? null,
            targetType: hoveredHandle ? getHandleType(hoveredHandle) : null,
            validation,
          },
        });
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
        engine.dispatch({
          type: 'HIT_NODE',
          payload: {
            targetNodeId: targetId || '',
            targetHandle: null,
            targetType: null,
            isValid: false,
            rejectReason: t('canvas.cannotConnect'),
          },
        });
        engine.dispatch({ type: 'END' });
        engine.reset();
        setRejectTooltip({ x: e.clientX, y: e.clientY, message: t('canvas.cannotConnect') });
        setTimeout(() => setRejectTooltip((prev) => (prev ? null : prev)), 500);
        setTempLine(null);
      };

      if (!targetId) {
        engine.dispatch({ type: 'HIT_EMPTY', payload: { x: e.clientX, y: e.clientY } });
        const result = engine.dispatch({ type: 'END' });
        if (result?.type !== 'OPEN_CREATE_MENU') {
          fail();
          return;
        }
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
        engine.reset();
        return;
      }

      if (!nodeEl) { fail(); return; }
      const connection = resolveConnection(targetId, dropHandle);
      const validation = validateConnection(connection);
      const error = validation.valid ? null : validation.reason ?? t('canvas.cannotConnect');
      if (error) {
        engine.dispatch({
          type: 'HIT_NODE',
          payload: {
            targetNodeId: targetId,
            targetHandle: dropHandle?.getAttribute('data-handle-id') ?? null,
            targetType: dropHandle ? getHandleType(dropHandle) : null,
            validation,
          },
        });
        const result = engine.dispatch({ type: 'END' });
        setRejectTooltip({ x: e.clientX, y: e.clientY, message: error });
        setTimeout(() => setRejectTooltip((prev) => (prev ? null : prev)), 1200);
        setTempLine(null);
        if (result?.type === 'REJECT_CONNECTION') {
          engine.reset();
        }
        return;
      }

      // All checks passed — create edge
      if (!connection) {
        fail();
        return;
      }
      engine.dispatch({
        type: 'HIT_NODE',
        payload: {
          targetNodeId: targetId,
          targetHandle: connection.targetHandleId,
          targetType: dropHandle ? getHandleType(dropHandle) : null,
          validation,
          edgePayload: {
            source: connection.sourceId,
            target: connection.targetId,
            sourceHandle: connection.sourceHandleId,
            targetHandle: connection.targetHandleId,
            sourceNodeId: connection.sourceId,
            targetNodeId: connection.targetId,
          },
        },
      });
      const result = engine.dispatch({ type: 'END' });
      if (result?.type !== 'CREATE_EDGE') {
        fail();
        return;
      }
      setEdges((eds) => {
        const targetNode = nodes.find((node) => node.id === connection.targetId);
        const compareSlot = targetNode?.type === 'compare'
          ? getNextCompareSlot(eds, connection.targetId)
          : null;
        return [...eds, {
          id: `e-${Date.now()}`,
          source: connection.sourceId,
          target: connection.targetId,
          sourceHandle: connection.sourceHandleId,
          targetHandle: connection.targetHandleId,
          data: compareSlot ? { compareSlot } : undefined,
          style: { stroke: '#555', strokeWidth: 1 },
        }];
      });
      setTempLine(null);
      engine.reset();
    };

    window.addEventListener('pointermove', handleMouseMove);
    window.addEventListener('pointerup', handleMouseUp);
  }, [screenToFlowPosition, nodes, edges, engine, connectionRuleMessages]);

  const removeReferenceEdge = useCallback((targetNodeId: string, sourceNodeId: string) => {
    setEdges((eds) => eds.filter((edge) => !(edge.source === sourceNodeId && edge.target === targetNodeId)));
  }, []);

  const addImageReferenceEdge = useCallback((targetNodeId: string, sourceNodeId: string) => {
    const sourceNode = nodes.find((node) => node.id === sourceNodeId);
    const targetNode = nodes.find((node) => node.id === targetNodeId);
    if (!sourceNode || !targetNode || sourceNode.type !== 'image' || targetNode.type !== 'image') return;
    if (!resolveNodeImage(sourceNode.data)?.imageUrl) return;

    const newEdge: Edge = {
      id: `image-reference-${sourceNodeId}-${targetNodeId}-${Date.now()}`,
      source: sourceNodeId,
      target: targetNodeId,
      sourceHandle: 'right-source',
      targetHandle: 'left-target',
      style: { stroke: '#555', strokeWidth: 1 },
    };
    const validation = validateImageProcessingEdge(nodes, edges, newEdge);
    if (!validation.valid) {
      showToast(validation.reason || t('canvas.cannotConnect'));
      return;
    }

    setEdges((currentEdges) => currentEdges.some((edge) => edge.source === sourceNodeId && edge.target === targetNodeId)
      ? currentEdges
      : [...currentEdges, newEdge]);
  }, [edges, nodes, setEdges, showToast, t, validateImageProcessingEdge]);

  const addExteriorRenderInputEdge = useCallback((targetNodeId: string, sourceNodeId: string) => {
    const sourceNode = nodes.find((node) => node.id === sourceNodeId);
    const targetNode = nodes.find((node) => node.id === targetNodeId);
    if (!sourceNode || !targetNode || targetNode.type !== 'exteriorRender') return;
    if (sourceNode.type === 'text' || sourceNode.type === 'compare' || sourceNode.type === 'upscale' || sourceNode.type === 'exteriorRender') return;
    if (!resolveNodeImage(sourceNode.data)?.imageUrl) return;

    const duplicateEdge = edges.find((edge) => {
      if (edge.source !== sourceNodeId || edge.target !== targetNodeId) return false;
      return edge.data?.kind === 'exteriorRenderInput' || edge.data?.kind === undefined;
    });
    if (duplicateEdge) {
      showToast('该图像已添加');
      return;
    }

    const newEdge: Edge = {
      id: `exterior-render-input-${sourceNodeId}-${targetNodeId}-${Date.now()}`,
      source: sourceNodeId,
      target: targetNodeId,
      sourceHandle: 'right-source',
      targetHandle: 'left-target',
      data: { kind: 'exteriorRenderInput' },
      style: { stroke: '#555', strokeWidth: 1 },
    };
    const validation = validateImageProcessingEdge(nodes, edges, newEdge);
    if (!validation.valid) {
      showToast(validation.reason || t('canvas.cannotConnect'));
      return;
    }

    setEdges((currentEdges) => {
      const stillDuplicate = currentEdges.some((edge) => {
        if (edge.source !== sourceNodeId || edge.target !== targetNodeId) return false;
        return edge.data?.kind === 'exteriorRenderInput' || edge.data?.kind === undefined;
      });
      return stillDuplicate ? currentEdges : [...currentEdges, newEdge];
    });
  }, [edges, nodes, setEdges, showToast, t, validateImageProcessingEdge]);

  const removeExteriorRenderInputEdge = useCallback((targetNodeId: string, sourceNodeId: string, sourceEdgeId?: string) => {
    if (!sourceNodeId && !sourceEdgeId) return;
    setEdges((currentEdges) => currentEdges.filter((edge) => {
      if (edge.target !== targetNodeId) return true;
      const edgeKind = edge.data?.kind;
      const isExteriorRenderInputEdge = edgeKind === 'exteriorRenderInput' || edgeKind === undefined;
      if (!isExteriorRenderInputEdge) return true;
      const matchesEdgeId = Boolean(sourceEdgeId) && edge.id === sourceEdgeId;
      const matchesSourceTarget = Boolean(sourceNodeId) && edge.source === sourceNodeId;
      return !(matchesEdgeId || matchesSourceTarget);
    }));
  }, [setEdges]);

  const swapCompareInputs = useCallback((targetNodeId: string, leftSourceNodeId: string, rightSourceNodeId: string) => {
    setEdges((eds) => {
      const bySlot = getCompareEdgesBySlot(eds, targetNodeId);
      const leftEdge = bySlot.left?.source === leftSourceNodeId ? bySlot.left : undefined;
      const rightEdge = bySlot.right?.source === rightSourceNodeId ? bySlot.right : undefined;
      if (!leftEdge || !rightEdge) return eds;

      return eds.map((edge) => {
        if (edge.id === leftEdge.id) {
          return { ...edge, data: { ...edge.data, compareSlot: 'right' } };
        }
        if (edge.id === rightEdge.id) {
          return { ...edge, data: { ...edge.data, compareSlot: 'left' } };
        }
        return edge;
      });
    });
  }, []);

  const assignReferenceEdgeRole = useCallback((targetNodeId: string, sourceNodeId: string, role: ImageRole, customRoleLabel?: string, localReferenceType?: import('../features/canvas/types/imageNode.types').LocalReferenceType, localReferenceLabel?: string, localReferencePoint?: LocalReferencePoint) => {
    const roleData = getRoleData(role, customRoleLabel, localReferenceType, localReferenceLabel);
    setEdges((eds) =>
      eds.map((edge) =>
        edge.source === sourceNodeId && edge.target === targetNodeId
          ? { ...edge, data: { ...edge.data, ...roleData, localReferencePoint } }
          : edge,
      ),
    );
    setNodes((nds) => nds.map((node) => (node.id === sourceNodeId ? { ...node, data: { ...node.data, ...roleData, localReferencePoint } } : node)));
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
    const estimatedWidth = sourceNode.width || IMAGE_NODE_PREVIEW_WIDTH;
    const newNode = createUpscaleCanvasNode({
      id: newNodeId,
      sourceNode,
      estimatedWidth,
      label,
      inputImage,
      width,
      height,
    });
    const newEdge: Edge = {
      id: `e-${Date.now()}`,
      source: sourceNodeId,
      target: newNodeId,
      sourceHandle: 'right-source',
      targetHandle: 'left-target',
      style: { stroke: '#555', strokeWidth: 1 },
    };
    const validation = validateImageProcessingEdge([...nodes, newNode], edges, newEdge);
    if (!validation.valid) {
      showToast(validation.reason || t('canvas.cannotConnect'));
      return;
    }

    setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), newNode]);
    setEdges((eds) => [...eds, newEdge]);

    setTimeout(() => {
      fitView({
        nodes: [{ id: newNodeId }],
        duration: 300,
        padding: 0.15,
        maxZoom: Math.min(getViewport().zoom, 1.2),
      });
    }, 50);
  }, [edges, nodes, setNodes, setEdges, fitView, getViewport, t, getAllNodeLabels, showToast, validateImageProcessingEdge]);

  const createSunSkyNode = useCallback((sourceNodeId: string, inputImage: string, width: number, height: number) => {
    const sourceNode = nodes.find((n) => n.id === sourceNodeId);
    if (!sourceNode) return;

    const newNodeId = `sunSky-${Date.now()}`;
    const label = getNextNodeTitle(getAllNodeLabels(), NODE_BASE_TITLES.sunSky);
    const estimatedWidth = sourceNode.width || IMAGE_NODE_PREVIEW_WIDTH;
    const newNode = createSunSkyCanvasNode({
      id: newNodeId,
      sourceNode,
      estimatedWidth,
      label,
      inputImage,
      width,
      height,
    });

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
    const estimatedWidth = sourceNode.measured?.width || sourceNode.width || IMAGE_NODE_PREVIEW_WIDTH;
    const newNode = createRelightCanvasNode({
      id: newNodeId,
      sourceNode,
      estimatedWidth,
      sourceNodeId,
      label,
      inputImage,
      width,
      height,
      options,
    });
    const newEdge: Edge = {
      id: `e-${Date.now()}`,
      source: sourceNodeId,
      target: newNodeId,
      sourceHandle: 'right-source',
      targetHandle: 'left-target',
      style: { stroke: '#555', strokeWidth: 1 },
    };
    const validation = validateImageProcessingEdge([...nodes, newNode], edges, newEdge);
    if (!validation.valid) {
      showToast(validation.reason || t('canvas.cannotConnect'));
      return;
    }

    setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), newNode]);
    setEdges((eds) => [...eds, newEdge]);

    setTimeout(() => {
      fitView({
        nodes: [{ id: newNodeId }],
        duration: 300,
        padding: 0.15,
        maxZoom: Math.min(getViewport().zoom, 1.2),
      });
    }, 50);
  }, [edges, nodes, setNodes, setEdges, fitView, getViewport, getAllNodeLabels, showToast, t, validateImageProcessingEdge]);

  const createCompareNode = useCallback((sourceNodeId: string) => {
    const sourceNode = nodes.find((n) => n.id === sourceNodeId);
    if (!sourceNode) return;

    // ── Strategy: reuse the most-recent pending CompareNode (exactly 1 input edge) ──
    const compareNodes = nodes.filter((n) => n.type === 'compare');
    const pendingList = compareNodes
      .map((node) => {
        const inputEdges = edges.filter((e) => e.target === node.id);
        const edgesBySlot = getCompareEdgesBySlot(edges, node.id);
        const emptySlot = edgesBySlot.left ? (edgesBySlot.right ? null : 'right') : 'left';
        return { node, inputEdges, emptySlot };
      })
      .filter(({ emptySlot, inputEdges }) => {
        if (!emptySlot || inputEdges.length !== 1) return false;
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
      const compareSlot = pendingList[0].emptySlot;
      const newEdge: Edge = {
        id: `e-${Date.now()}`,
        source: sourceNodeId,
        target: targetCompare.id,
        sourceHandle: 'right-source',
        targetHandle: 'left-target',
        data: { compareSlot },
        style: { stroke: '#555', strokeWidth: 1 },
      };
      const validation = validateImageProcessingEdge(nodes, edges, newEdge);
      if (!validation.valid) {
        showToast(validation.reason || t('canvas.cannotConnect'));
        return;
      }
      setEdges((eds) => [...eds, newEdge]);
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
    const estimatedWidth = sourceNode.width || IMAGE_NODE_PREVIEW_WIDTH;
    const newNode = createCompareCanvasNode({
      id: newNodeId,
      sourceNode,
      estimatedWidth,
      label,
    });
    const newEdge: Edge = {
      id: `e-${Date.now()}`,
      source: sourceNodeId,
      target: newNodeId,
      sourceHandle: 'right-source',
      targetHandle: 'left-target',
      data: { compareSlot: 'left' },
      style: { stroke: '#555', strokeWidth: 1 },
    };
    const validation = validateImageProcessingEdge([...nodes, newNode], edges, newEdge);
    if (!validation.valid) {
      showToast(validation.reason || t('canvas.cannotConnect'));
      return;
    }

    setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), newNode]);
    setEdges((eds) => [...eds, newEdge]);

    setTimeout(() => {
      fitView({
        nodes: [{ id: newNodeId }],
        duration: 300,
        padding: 0.15,
        maxZoom: Math.min(getViewport().zoom, 1.2),
      });
    }, 50);
  }, [nodes, edges, setNodes, setEdges, fitView, getViewport, t, getAllNodeLabels, showToast, validateImageProcessingEdge]);

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
    let hasValidSourceImage = false;
    if (action === 'image_to_text') {
      const existingImageNodes = edges
        .filter((edge) => edge.target === nodeId)
        .map((edge) => nodes.find((node) => node.id === edge.source && node.type === 'image'))
        .filter((node): node is Node => Boolean(node));
      const existingImageNode = existingImageNodes.find(
        (node) => Boolean(resolveNodeImage(node.data)?.imageUrl),
      ) || existingImageNodes[0] || null;
      sourceImageNodeId = existingImageNode?.id || null;
      hasValidSourceImage = Boolean(resolveNodeImage(existingImageNode?.data)?.imageUrl);

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

    const editorInput = action === 'image_to_text' ? t(TEXT_NODE_IMAGE_EXTRACTION_PROMPT_KEY) : '';
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
    if (action === 'image_to_text' && hasValidSourceImage) {
      submitTextNodeRef.current(nodeId, {
        lastActionType: action,
        editorInput,
      });
    }
  }, [edges, fitView, getAllNodeLabels, getViewport, nodes, setActivePanel, setEdges, setNodes, t]);

  const {
    copyNodes,
    pasteNodes,
    pasteNodesFromKeyboard,
    hasCopiedNodes,
  } = useCanvasNodeClipboard({
    nodes,
    setNodes,
    getNodes,
    getAllNodeLabels,
    getCopiedNodeTitle: getNextCopiedNodeTitle,
    getNodeBaseTitle: (type) => NODE_BASE_TITLES[type] || type,
    lastPointerPositionRef,
    screenToFlowPosition,
  });

  const {
    uploadToast,
    handleDropFiles,
    objectUrlsRef,
  } = useCanvasImageImport({
    setNodes,
    screenToFlowPosition,
    getAllNodeLabels,
    showToast,
    t,
    hasCopiedNodes,
    lastPointerPositionRef,
  });

  const uploadExteriorRenderInputImages = useCallback((targetNodeId: string, files: FileList | null) => {
    if (!files?.length) return;

    const targetNode = nodes.find((node) => node.id === targetNodeId && node.type === 'exteriorRender');
    if (!targetNode) return;

    const { validFiles, rejectedFiles: initialRejectedFiles } = filterImageImportFiles(Array.from(files));
    const rejectedFiles: ImageFileReject[] = [...initialRejectedFiles];
    const preCheckMessage = getImageRejectMessage(rejectedFiles, validFiles.length);
    if (validFiles.length === 0) {
      if (preCheckMessage) showToast(preCheckMessage);
      return;
    }

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
        const objectUrl = URL.createObjectURL(file);
        objectUrlsRef.current.add(objectUrl);
        return decodeImageFile(file, objectUrl)
          .then(({ naturalWidth, naturalHeight }) => ({
            node: buildUploadedImageNode({
              id: `image-${Date.now()}-${index}`,
              label: fileFinalLabels[index],
              objectUrl,
              naturalWidth,
              naturalHeight,
              position: {
                x: targetNode.position.x - IMAGE_NODE_PREVIEW_WIDTH - 100,
                y: targetNode.position.y + index * 48,
              },
              selected: index === 0,
            }),
            index,
          }))
          .catch(() => {
            URL.revokeObjectURL(objectUrl);
            objectUrlsRef.current.delete(objectUrl);
            rejectedFiles.push({ file, reason: 'decode-failed' });
            console.warn(`[Canvas] Failed to decode image: ${file.name || 'unnamed'}`);
            return null;
          });
      }),
    ).then((results) => {
      const createdNodes = results
        .filter((result): result is { node: Node; index: number } => Boolean(result))
        .map((result) => result.node);

      if (createdNodes.length === 0) {
        const finalMessage = getImageRejectMessage(rejectedFiles, createdNodes.length);
        if (finalMessage) showToast(finalMessage);
        return;
      }

      const graphNodes = [...nodes, ...createdNodes];
      const createdEdges = createdNodes.flatMap((sourceNode) => {
        const edge: Edge = {
          id: `exterior-render-input-${sourceNode.id}-${targetNodeId}-${Date.now()}`,
          source: sourceNode.id,
          target: targetNodeId,
          sourceHandle: 'right-source',
          targetHandle: 'left-target',
          data: { kind: 'exteriorRenderInput' },
          style: { stroke: '#555', strokeWidth: 1 },
        };
        const validation = validateImageProcessingEdge(graphNodes, edges, edge);
        if (!validation.valid) return [];
        return [edge];
      });

      setNodes((currentNodes) => [
        ...currentNodes.map((node) => ({ ...node, selected: false })),
        ...createdNodes,
      ]);
      setEdges((currentEdges) => [...currentEdges, ...createdEdges]);

      setTimeout(() => {
        fitView({
          nodes: [...createdNodes.map((node) => ({ id: node.id })), { id: targetNodeId }],
          duration: 300,
          padding: 0.25,
          maxZoom: Math.min(getViewport().zoom, 1),
        });
      }, 0);

      const partialMessage = getImageRejectMessage(rejectedFiles, createdNodes.length);
      if (partialMessage) showToast(partialMessage);
    });
  }, [edges, fitView, getAllNodeLabels, getViewport, nodes, objectUrlsRef, setEdges, setNodes, showToast, validateImageProcessingEdge]);

  const createExteriorRenderOutput = useCallback((
    sourceNodeId: string,
    taskId: string,
    request: ExteriorRenderRequest,
  ) => {
    const currentNodes = getNodes();
    const sourceNode = currentNodes.find((node) => (
      node.id === sourceNodeId && node.type === 'exteriorRender'
    ));
    if (!sourceNode) return null;

    const label = getNextNodeTitle(
      currentNodes.map((node) => String(node.data.label || '')),
      t('exteriorRender.outputTitlePrefix'),
    );
    const output = buildExteriorRenderProcessingOutput({
      sourceNode,
      request,
      taskId,
      timestamp: Date.now(),
      label,
      existingNodes: currentNodes,
    });

    setNodes((nodesBeforeCreation) => {
      if (!nodesBeforeCreation.some((node) => node.id === sourceNodeId)) return nodesBeforeCreation;
      if (nodesBeforeCreation.some((node) => node.id === output.node.id)) return nodesBeforeCreation;
      return [
        ...nodesBeforeCreation.map((node) => ({ ...node, selected: false })),
        output.node,
      ];
    });
    setEdges((edgesBeforeCreation) => (
      edgesBeforeCreation.some((edge) => edge.id === output.edge.id)
        ? edgesBeforeCreation
        : [...edgesBeforeCreation, output.edge]
    ));

    setTimeout(() => {
      fitView({
        nodes: [{ id: output.node.id }],
        duration: 300,
        padding: 0.18,
        maxZoom: Math.min(getViewport().zoom, 1),
      });
    }, 0);

    return output.node.id;
  }, [fitView, getNodes, getViewport, setEdges, setNodes, t]);

  const writeExteriorRenderResult = useCallback((
    sourceNodeId: string,
    outputNodeId: string,
    request: ExteriorRenderRequest,
    result: ExteriorRenderResult,
  ) => {
    const currentNodes = getNodes();
    const sourceNode = currentNodes.find((node) => node.id === sourceNodeId && node.type === 'exteriorRender');
    const outputNode = currentNodes.find((node) => node.id === outputNodeId && node.type === 'image');
    if (!sourceNode || !outputNode || result.images.length === 0) return false;

    const completedOutput = buildExteriorRenderCompletedOutput({
      outputNode,
      sourceNodeId,
      request,
      result,
      timestamp: Date.now(),
      createImageNodeData: (image, batch) => ({
        ...createGeneratedNodeDataFromHistoryImage(image, batch),
        ...getRoleData(null),
      }),
    });
    if (!completedOutput) return false;

    setNodes((nodesBeforeWriteback) => {
      if (!nodesBeforeWriteback.some((node) => node.id === sourceNodeId)) return nodesBeforeWriteback;
      return nodesBeforeWriteback.map((node) => (
        node.id === outputNodeId ? completedOutput : node
      ));
    });
    return true;
  }, [getNodes, setNodes]);

  const failExteriorRenderOutput = useCallback((
    outputNodeId: string,
    taskId: string,
    errorMessage: string,
  ) => {
    const outputNode = getNodes().find((node) => node.id === outputNodeId && node.type === 'image');
    if (!outputNode) return;
    const failedOutput = buildExteriorRenderFailedOutput({
      outputNode,
      taskId,
      errorMessage,
      timestamp: Date.now(),
    });
    setNodes((currentNodes) => currentNodes.map((node) => (
      node.id === outputNodeId ? failedOutput : node
    )));
  }, [getNodes, setNodes]);
  const lockedPromptReferenceNodeIds = useMemo(() => {
    const lockedNodeIds = new Set<string>();
    nodes.forEach((node) => {
      if (!isProcessingImageNode(node)) return;
      getPromptReferenceSourceNodeIds(node.data).forEach((sourceNodeId) => {
        lockedNodeIds.add(sourceNodeId);
      });
    });
    return lockedNodeIds;
  }, [nodes]);

  const duplicateNodeById = useCallback((nodeId: string) => {
    const node = nodes.find((currentNode) => currentNode.id === nodeId);
    if (!node) return;
    const nodeType = node.type || '';
    const fallbackBaseTitle = NODE_BASE_TITLES[nodeType] || nodeType;
    const label = getNextCopiedNodeTitle(
      getAllNodeLabels(),
      (node.data?.label as string | undefined) || '',
      fallbackBaseTitle,
    );
    const newNode: Node = {
      ...node,
      id: `${node.type}-${Date.now()}`,
      position: { x: node.position.x + 40, y: node.position.y + 40 },
      data: {
        ...prepareCanvasNodeDataForCopy(nodeType, node.data),
        label,
        title: typeof node.data.title === 'string' ? label : node.data.title,
      },
      style: node.style ? { ...node.style } : undefined,
      measured: node.measured ? { ...node.measured } : undefined,
      selected: true,
      dragging: false,
    };
    setNodes((currentNodes) => [
      ...currentNodes.map((currentNode) => ({ ...currentNode, selected: false })),
      newNode,
    ]);
  }, [getAllNodeLabels, nodes, setNodes]);

  const deleteNodeById = useCallback((nodeId: string) => {
    setNodes((currentNodes) => currentNodes.filter((node) => node.id !== nodeId));
    setEdges((currentEdges) => currentEdges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
  }, [setEdges, setNodes]);

  const nodesWithCallbacks = useMemo(() => {
    return nodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        onDuplicateNode: duplicateNodeById,
        onDeleteNode: deleteNodeById,
        isReferenceLocked: n.type === 'image' ? lockedPromptReferenceNodeIds.has(n.id) : undefined,
        onStartLineDraw: startLineDraw,
        onRemoveReferenceEdge: removeReferenceEdge,
        onAddImageReferenceEdge: n.type === 'image' ? addImageReferenceEdge : undefined,
        onAddExteriorRenderInputEdge: n.type === 'exteriorRender' ? addExteriorRenderInputEdge : undefined,
        onRemoveExteriorRenderInputEdge: n.type === 'exteriorRender' ? removeExteriorRenderInputEdge : undefined,
        onUploadExteriorRenderInputImages: n.type === 'exteriorRender' ? uploadExteriorRenderInputImages : undefined,
        onCreateExteriorRenderOutput: n.type === 'exteriorRender' ? createExteriorRenderOutput : undefined,
        onExteriorRenderResult: n.type === 'exteriorRender' ? writeExteriorRenderResult : undefined,
        onExteriorRenderOutputFailed: n.type === 'exteriorRender' ? failExteriorRenderOutput : undefined,
        onSwapCompareInputs: swapCompareInputs,
        onAssignReferenceEdgeRole: assignReferenceEdgeRole,
        onCreateUpscaleNode: n.type === 'image' || n.type === 'upscale' || n.type === 'relight' ? createUpscaleNode : undefined,
        onCreateSunSkyNode: n.type === 'image' ? createSunSkyNode : undefined,
        onCreateCompareNode: n.type === 'image' || n.type === 'relight' ? createCompareNode : undefined,
        onCreateRelightNode: n.type === 'image' || n.type === 'relight' ? createRelightNode : undefined,
        onTextAction: n.type === 'text' ? handleTextAction : undefined,
        onFocusNode: n.type === 'image' ? focusCanvasNode : undefined,
        activeImageMarkTargetNodeId: n.type === 'image' ? activeImageMarkTargetNodeId : undefined,
        activeImageMarkSourceNodeId: n.type === 'image' ? activeImageMarkSourceNodeId : undefined,
        activeImageMarkSessionId: n.type === 'image' ? activeImageMarkSessionId : undefined,
        onStartCanvasImageMarkSelection: n.type === 'image' ? (targetNodeId: string) => {
          setActiveImageMarkTargetNodeId(targetNodeId);
          setActiveImageMarkSourceNodeId(null);
          setActiveImageMarkSessionId(`mark-session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
        } : undefined,
        onSelectCanvasImageMarkSource: n.type === 'image' ? setActiveImageMarkSourceNodeId : undefined,
        onExitCanvasImageMarkSelection: n.type === 'image' ? () => {
          setActiveImageMarkTargetNodeId(null);
          setActiveImageMarkSourceNodeId(null);
          setActiveImageMarkSessionId(null);
        } : undefined,
        onOpenNodeHistory: n.type === 'image' ? openHistoryPanel : undefined,
        onRegisterObjectUrl: n.type === 'image' ? (url: string) => { objectUrlsRef.current.add(url); } : undefined,
      },
    }));
  }, [activeImageMarkSessionId, activeImageMarkSourceNodeId, activeImageMarkTargetNodeId, nodes, duplicateNodeById, deleteNodeById, lockedPromptReferenceNodeIds, startLineDraw, removeReferenceEdge, addImageReferenceEdge, addExteriorRenderInputEdge, removeExteriorRenderInputEdge, uploadExteriorRenderInputImages, createExteriorRenderOutput, writeExteriorRenderResult, failExteriorRenderOutput, swapCompareInputs, assignReferenceEdgeRole, createUpscaleNode, createSunSkyNode, createCompareNode, createRelightNode, handleTextAction, focusCanvasNode, openHistoryPanel, objectUrlsRef]);

  // ─── History (Undo / Redo) ───
  const normalizeHistoryEdges = useCallback((currentEdges: Edge[], currentNodes: Node[]) => {
    const nodeIds = new Set(currentNodes.map((node) => node.id));
    const connectedEdges = currentEdges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target));
    return removeComposeTextInputEdges(connectedEdges, currentNodes);
  }, []);
  const { undo, redo, beginNodeDrag, endNodeDrag } = useCanvasUndoRedo({
    nodes,
    edges,
    setNodes,
    setEdges,
    maxHistoryLength: 50,
    resetKey: projectId || 'new',
    normalizeEdges: normalizeHistoryEdges,
  });

  const handleNodeDragStart = useCallback<OnNodeDrag>(() => {
    beginNodeDrag();
  }, [beginNodeDrag]);

  const handleNodeDragStop = useCallback<OnNodeDrag>((_event, _node, draggedNodes) => {
    endNodeDrag(draggedNodes);
  }, [endNodeDrag]);

  const {
    deleteSelected,
    selectAll,
    deselectAll,
    duplicateNode,
    handleEdgeClick,
    handlePaneClick,
  } = useCanvasSelectionActions({
    nodes,
    edges,
    setNodes,
    setEdges,
    getAllNodeLabels,
    getCopiedNodeTitle: getNextCopiedNodeTitle,
    getNodeBaseTitle: (type) => NODE_BASE_TITLES[type] || type || '节点',
    onCloseNodeContextMenu: closeNodeContextMenu,
    onCloseCreateMenu: () => {
      setCreateMenu(null);
      setTempLine(null);
    },
  });

  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    const target = event.target as HTMLElement;
    if (!target.closest('.node-preview-card')) {
      closeNodeContextMenu();
      return;
    }
    closeContextMenu();
    openNodeContextMenu(event.clientX, event.clientY, node.id);
  }, [closeContextMenu, closeNodeContextMenu, openNodeContextMenu]);

  const handleCanvasPaneClick = useCallback(() => {
    window.dispatchEvent(new Event(IMAGE_CROP_CANCEL_EVENT));
    handlePaneClick();
  }, [handlePaneClick]);

  const deleteEdgeById = useCallback((edgeId: string) => {
    setEdges((currentEdges) => currentEdges.filter((edge) => edge.id !== edgeId));
  }, [setEdges]);

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
  const {
    zoom,
    onViewportChange,
    handleReset,
    handleZoomChange,
    panViewport,
    zoomIn,
    zoomOut,
    fitViewCanvas,
  } = useCanvasViewport({
    getViewport,
    setViewport,
    fitView,
    defaultZoom: 1,
    minZoom: CANVAS_MIN_ZOOM,
    maxZoom: CANVAS_MAX_ZOOM,
    panStep: 40,
    zoomStep: 1.15,
  });

  // ─── Keyboard Shortcuts ───
  const closeCreateConnectionMenu = useCallback(() => {
    setCreateMenu(null);
    setTempLine(null);
  }, []);

  useCanvasKeyboardShortcuts({
    isCreateMenuOpen: Boolean(createMenu),
    isHelpOpen: showHelp,
    copyNodes,
    pasteNodes: pasteNodesFromKeyboard,
    deleteSelected,
    undo,
    redo,
    selectAll,
    deselectAll,
    closeCreateMenu: closeCreateConnectionMenu,
    closeHelp,
    panViewport,
    zoomIn,
    zoomOut,
    fitView: fitViewCanvas,
  });

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

  const {
    isDragOver,
    handleCanvasDragOver,
    handleCanvasDragLeave,
    handleCanvasDrop,
    handleDragOverCapture,
    handleDropCapture,
  } = useCanvasDragDrop({ handleDropFiles });

  const addNode = useCallback(
    (type: string, pos?: { x: number; y: number }, customLabel?: string) => {
      const position = pos || { x: 400 + Math.random() * 100, y: 200 + Math.random() * 100 };
      const baseTitle = type === 'text'
        ? NODE_BASE_TITLES.text
        : customLabel || NODE_BASE_TITLES[type] || type;
      const label = getNextNodeTitle(getAllNodeLabels(), baseTitle);
      const newNode = createBasicCanvasNode({
        id: `${type}-${Date.now()}`,
        type,
        position,
        label,
      });
      setNodes((nds) => [...nds, newNode]);
      closeContextMenu();
    },
    [setNodes, getAllNodeLabels, closeContextMenu],
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
          title: String(sourceData.label || sourceData.title || t('textNode.title')),
          content: getTextContent(sourceData),
          status: sourceData.status || 'empty',
        }];
      });
  }, [edges, nodes, selectedTextNode, t]);
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

  const submitTextNode = useCallback(async (
    nodeId: string,
    dataOverride?: Partial<TextNodeData>,
  ) => {
    if (runningTextTaskIdsRef.current.has(nodeId)) return;

    const textNode = nodes.find((node) => node.id === nodeId && node.type === 'text');
    if (!textNode) return;
    const nodeData = {
      ...(textNode.data as TextNodeData),
      ...dataOverride,
    };
    const incomingEdges = edges.filter((edge) => edge.target === nodeId);
    const inputSources = incomingEdges
      .map((edge) => nodes.find((node) => node.id === edge.source))
      .filter((node): node is Node => Boolean(node));
    const submitState = getTextNodeSubmitState(nodeData, inputSources);
    if (!submitState.canSubmit) return;
    runningTextTaskIdsRef.current.add(nodeId);

    const instruction = getTextNodeInstruction(nodeData);
    const referencedTextNodes = inputSources
      .filter((node) => node.type === 'text');
    const referencedImageNode = inputSources
      .find((node) => node?.type === 'image' && Boolean(resolveNodeImage(node.data)?.imageUrl));
    const sourceText = referencedTextNodes
      .map((node) => getTextContent(node.data))
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

    const taskId = `text-task-${Date.now()}`;
    const createdAt = Date.now();
    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                isProcessing: true,
                status: 'editing',
                lastActionType: action,
                generationTask: {
                  taskId,
                  status: 'running',
                  createdAt,
                  updatedAt: createdAt,
                },
              },
            }
          : node,
      ),
    );
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
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  content: result,
                  text: result,
                  status: 'result',
                  isProcessing: false,
                  editorInput: action === 'image_to_text' ? result : '',
                  ...(action === 'image_to_text'
                    ? {
                        textMode: 'compose',
                        textSource: 'image_extract',
                        lastActionType: 'text_to_text',
                      }
                    : {}),
                  generationTask: {
                    taskId,
                    status: 'success',
                    createdAt,
                    updatedAt: Date.now(),
                  },
                },
              }
            : node,
        ),
      );
    } catch {
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  isProcessing: false,
                  generationTask: {
                    taskId,
                    status: 'failed',
                    createdAt,
                    updatedAt: Date.now(),
                  },
                },
              }
            : node,
        ),
      );
    } finally {
      runningTextTaskIdsRef.current.delete(nodeId);
    }
  }, [edges, nodes, setNodes]);

  useEffect(() => {
    submitTextNodeRef.current = submitTextNode;
  }, [submitTextNode]);

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
    closeNodeContextMenu();
    const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    openContextMenu(e.clientX, e.clientY, pos);
  }, [closeNodeContextMenu, openContextMenu, screenToFlowPosition]);

  // ─── Context Menu Handlers ───
  const handleCloseContextMenu = closeContextMenu;

  const handleCloseCreateMenu = useCallback(() => {
    closeContextMenu();
    closeNodeContextMenu();
    setCreateMenu(null);
    setTempLine(null);
  }, [closeContextMenu, closeNodeContextMenu]);

  const handleCloseNodeContextMenu = useCallback(() => {
    closeContextMenu();
    closeNodeContextMenu();
  }, [closeContextMenu, closeNodeContextMenu]);

  const handleContextMenuReopen = useCallback((clientX: number, clientY: number) => {
    const pos = screenToFlowPosition({ x: clientX, y: clientY });
    openContextMenu(clientX, clientY, pos);
  }, [openContextMenu, screenToFlowPosition]);

  const handleNodeContextMenuReopen = useCallback((clientX: number, clientY: number) => {
    if (!nodeContextMenu) return;
    openNodeContextMenu(clientX, clientY, nodeContextMenu.nodeId);
  }, [nodeContextMenu, openNodeContextMenu]);

  const nodeContextMenuNode = useMemo(
    () => nodeContextMenu ? nodes.find((node) => node.id === nodeContextMenu.nodeId) : null,
    [nodeContextMenu, nodes],
  );
  const canCreateImageToolsFromContextNode = Boolean(
    nodeContextMenuNode?.type === 'image' &&
    !isProcessingImageNode(nodeContextMenuNode) &&
    resolveNodeImage(nodeContextMenuNode.data),
  );

  const handleCreateImageToolFromContextMenu = useCallback((nodeId: string, type: 'relight' | 'upscale' | 'compare') => {
    const sourceNode = nodes.find((node) => node.id === nodeId);
    if (!sourceNode || sourceNode.type !== 'image') return;
    if (isProcessingImageNode(sourceNode)) return;

    const resolved = resolveNodeImage(sourceNode.data);
    if (!resolved) {
      showToast(t('imageNode.noImageForCompare'));
      return;
    }

    if (type === 'relight') {
      createRelightNode(nodeId, resolved.imageUrl, resolved.width, resolved.height);
      return;
    }
    if (type === 'upscale') {
      createUpscaleNode(nodeId, resolved.imageUrl, resolved.width, resolved.height);
      return;
    }
    createCompareNode(nodeId);
  }, [createCompareNode, createRelightNode, createUpscaleNode, nodes, showToast, t]);

  const handleContextMenuAddNode = useCallback((type: string, label: string) => {
    if (!contextMenu) return;
    addNode(type, contextMenu.flowPos, label);
  }, [contextMenu, addNode]);

  const handleCreateAndConnect = useCallback((type: string) => {
    if (!createMenu) return;
    if (!['text', 'image', 'video', 'relight', 'upscale', 'compare', 'exteriorRender'].includes(type)) {
      setCreateMenu(null);
      setTempLine(null);
      return;
    }
    const existingTargetNode = createMenu.sourceHandleType === 'target'
      ? nodes.find((node) => node.id === createMenu.sourceNodeId)
      : null;
    if (
      existingTargetNode?.type === 'text' &&
      isComposeTextNode(existingTargetNode.data)
    ) {
      setCreateMenu(null);
      setTempLine(null);
      return;
    }
    const timestamp = Date.now();
    const newNodeId = `${type}-${timestamp}`;
    const baseTitle = type === 'exteriorRender'
      ? t('exteriorRender.title')
      : NODE_BASE_TITLES[type] || type;
    const label = getNextNodeTitle(getAllNodeLabels(), baseTitle);
    const newNode = createBasicCanvasNode({
      id: newNodeId,
      type,
      position: createMenu.flowPos,
      label,
    });
    const startsFromSource = createMenu.sourceHandleType === 'source';
    const newEdge: Edge = {
      id: `e-${timestamp}`,
      source: startsFromSource ? createMenu.sourceNodeId : newNodeId,
      target: startsFromSource ? newNodeId : createMenu.sourceNodeId,
      sourceHandle: startsFromSource ? createMenu.sourceHandleId : 'right-source',
      targetHandle: startsFromSource ? 'left-target' : createMenu.sourceHandleId,
      data: startsFromSource && type === 'compare' ? { compareSlot: 'left' } : undefined,
      style: { stroke: '#555', strokeWidth: 1 },
    };
    const graphNodes = [...nodes, newNode];
    const targetNode = graphNodes.find((node) => node.id === newEdge.target);
    if (targetNode && ['relight', 'upscale', 'compare', 'exteriorRender'].includes(targetNode.type || '')) {
      const validation = validateImageProcessingEdge(graphNodes, edges, newEdge);
      if (!validation.valid) {
        showToast(validation.reason || t('canvas.cannotConnect'));
        setCreateMenu(null);
        setTempLine(null);
        return;
      }
    }
    setNodes((nds) => [...nds, newNode]);
    setEdges((eds) => [...eds, newEdge]);
    setCreateMenu(null);
    setTempLine(null);
  }, [createMenu, edges, getAllNodeLabels, nodes, setNodes, setEdges, showToast, t, validateImageProcessingEdge]);

  const handleNodeDelete = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
  }, [setNodes]);

  const selectedTextNodeId = selectedTextNode?.id;
  const { textNodePanelPosition } = useTextNodeFloatingPanelPosition({
    selectedTextNodeId,
    offset: 24,
  });

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

      <CanvasFlowStyles />

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
        onNodesChange={handleCanvasNodesChange}
        onNodeDragStart={handleNodeDragStart}
        onNodeDragStop={handleNodeDragStop}
        onNodeContextMenu={onNodeContextMenu}
        onViewportChange={onViewportChange}
        onEdgeClick={handleEdgeClick}
        onDeleteEdge={deleteEdgeById}
        onPaneClick={handleCanvasPaneClick}
        onSelectionStart={onSelectionStart}
        onSelectionEnd={onSelectionEnd}
        onDragOverCapture={handleDragOverCapture}
        onDropCapture={handleDropCapture}
      />

      <CanvasImageMarkCaptureLayer targetNodeId={activeImageMarkTargetNodeId} />

      <CanvasSidebar
        activePanel={activePanel}
        onSetActivePanel={setActivePanel}
        onAddNode={addNode}
        onUseHistoryImages={handleUseGlobalHistoryImages}
      />

      {selectedTextNode && (
        (selectedTextNode.data as TextNodeData).textMode !== 'compose' ||
        (selectedTextNode.data as TextNodeData).textSource === 'image_extract'
      ) && (
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
            onSubmit={() => submitTextNode(selectedTextNode.id)}
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
            onClose={closeHistoryPanel}
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
        canCreateImageTools={canCreateImageToolsFromContextNode}
        onCreateImageToolNode={nodeContextMenuNode?.type === 'image' ? handleCreateImageToolFromContextMenu : undefined}
        onNodeDuplicate={duplicateNode}
        onNodePaste={pasteNodes}
        onNodeDelete={handleNodeDelete}
        onNodeCopy={copyNodes}
      />

      <CanvasToast message={toastMsg} />

      <CanvasToolbar
        showMinimap={showMinimap}
        onToggleMinimap={toggleMinimap}
        snapGrid={snapGrid}
        onToggleSnapGrid={toggleSnapGrid}
        zoom={zoom}
        onZoomChange={handleZoomChange}
        onReset={handleReset}
        showHelp={showHelp}
        onToggleHelp={toggleHelp}
      />
    </div>
  );
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
