export function CanvasFlowStyles() {
  return (
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
  );
}
