import { describe, expect, it } from 'vitest';
import { canStartCanvasMarkSelection, createImageNodeViewModel } from './imageNodeViewModel';

describe('createImageNodeViewModel', () => {
  it('allows an idle empty target node to enter canvas mark selection', () => {
    expect(canStartCanvasMarkSelection(false)).toBe(true);
    expect(canStartCanvasMarkSelection(true)).toBe(false);
  });

  it('treats a completed exterior-render output as an editable image', () => {
    const viewModel = createImageNodeViewModel({
      currentImage: '/assets/mock/generation-results/result-01.png',
      currentResultSet: {
        batchId: 'exterior-render-task-1',
        images: [{
          resultId: 'result-1',
          imageUrl: '/assets/mock/generation-results/result-01.png',
          width: 1024,
          height: 1024,
          seed: 1,
        }],
        selectedIndex: 0,
        isExpanded: false,
      },
      assetSource: 'generated',
      isGeneratedResult: true,
      generationStatus: 'completed',
      sourceWorkflow: {
        type: 'exteriorRender',
        sourceNodeId: 'exterior-render-1',
      },
    });

    expect(viewModel.viewKind).toBe('editor');
    expect(viewModel.showControlPanel).toBe(true);
    expect(viewModel.showReferenceUsageControl).toBe(true);
    expect(viewModel.canDownload).toBe(true);
  });

  it('keeps outputs saved with the former exteriorRenderOutput asset source editable', () => {
    const viewModel = createImageNodeViewModel({
      currentImage: '/assets/mock/generation-results/result-01.png',
      currentResultId: 'result-1',
      assetSource: 'exteriorRenderOutput',
      isGeneratedResult: true,
      sourceWorkflow: {
        type: 'exteriorRender',
        sourceNodeId: 'exterior-render-1',
      },
    });

    expect(viewModel.viewKind).toBe('editor');
    expect(viewModel.showControlPanel).toBe(true);
  });
});
