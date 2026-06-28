import { create } from 'zustand';
import { FlowNode, FlowEdge, Viewport, NodeTypeDef } from './types';

interface HistoryState {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

interface FlowStore {
  nodes: FlowNode[];
  edges: FlowEdge[];
  selectedNodeIds: Set<string>;
  selectedEdgeIds: Set<string>;
  viewport: Viewport;
  snapToGrid: boolean;
  gridSize: number;
  draggingNodeId: string | null;
  dragStartClient: { x: number; y: number } | null;
  dragStartNodePos: { x: number; y: number } | null;
  connecting: { sourceNodeId: string; sourcePortId: string } | null;
  history: HistoryState[];
  historyIndex: number;
  nodeTypes: NodeTypeDef[];

  // actions
  setNodes: (nodes: FlowNode[]) => void;
  setEdges: (edges: FlowEdge[]) => void;
  addNode: (node: FlowNode) => void;
  updateNode: (id: string, patch: Partial<FlowNode>) => void;
  removeNode: (id: string) => void;
  addEdge: (edge: FlowEdge) => void;
  removeEdge: (id: string) => void;
  setViewport: (viewport: Viewport) => void;
  pan: (dx: number, dy: number) => void;
  zoomAt: (point: { x: number; y: number }, delta: number) => void;
  setZoom: (zoom: number) => void;
  selectNode: (id: string, multi?: boolean) => void;
  selectEdge: (id: string) => void;
  clearSelection: () => void;
  deleteSelected: () => void;
  startDragNode: (id: string, clientPos: { x: number; y: number }) => void;
  moveDragNode: (clientPos: { x: number; y: number }) => void;
  endDragNode: () => void;
  startConnect: (sourceNodeId: string, sourcePortId: string) => void;
  endConnect: (targetNodeId: string, targetPortId: string) => void;
  cancelConnect: () => void;
  toggleSnap: () => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  setNodeTypes: (types: NodeTypeDef[]) => void;
  importFlow: (nodes: FlowNode[], edges: FlowEdge[]) => void;
  reset: () => void;
}

function snap(v: number, grid: number) {
  return Math.round(v / grid) * grid;
}

const initialViewport: Viewport = { x: 0, y: 0, zoom: 1 };

export const useFlowStore = create<FlowStore>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeIds: new Set(),
  selectedEdgeIds: new Set(),
  viewport: initialViewport,
  snapToGrid: true,
  gridSize: 20,
  draggingNodeId: null,
  dragStartClient: null,
  dragStartNodePos: null,
  connecting: null,
  history: [],
  historyIndex: -1,
  nodeTypes: [],

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  addNode: (node) => {
    const state = get();
    state.pushHistory();
    set({ nodes: [...state.nodes, node] });
  },

  updateNode: (id, patch) => {
    const state = get();
    set({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    });
  },

  removeNode: (id) => {
    const state = get();
    state.pushHistory();
    set({
      nodes: state.nodes.filter((n) => n.id !== id),
      edges: state.edges.filter((e) => e.sourceNodeId !== id && e.targetNodeId !== id),
      selectedNodeIds: new Set([...state.selectedNodeIds].filter((sid) => sid !== id)),
    });
  },

  addEdge: (edge) => {
    const state = get();
    state.pushHistory();
    set({ edges: [...state.edges, edge] });
  },

  removeEdge: (id) => {
    const state = get();
    state.pushHistory();
    set({
      edges: state.edges.filter((e) => e.id !== id),
      selectedEdgeIds: new Set([...state.selectedEdgeIds].filter((sid) => sid !== id)),
    });
  },

  setViewport: (viewport) => set({ viewport }),

  pan: (dx, dy) =>
    set((s) => ({
      viewport: { ...s.viewport, x: s.viewport.x + dx, y: s.viewport.y + dy },
    })),

  zoomAt: (point, delta) => {
    const s = get();
    const oldZoom = s.viewport.zoom;
    const newZoom = Math.min(Math.max(oldZoom * (1 + delta), 0.1), 3);
    const factor = newZoom / oldZoom;
    set({
      viewport: {
        zoom: newZoom,
        x: point.x - (point.x - s.viewport.x) * factor,
        y: point.y - (point.y - s.viewport.y) * factor,
      },
    });
  },

  setZoom: (zoom) => set((s) => ({ viewport: { ...s.viewport, zoom } })),

  selectNode: (id, multi) =>
    set((s) => {
      const next = new Set(multi ? s.selectedNodeIds : []);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedNodeIds: next, selectedEdgeIds: new Set() };
    }),

  selectEdge: (id) =>
    set((s) => ({
      selectedEdgeIds: new Set([id]),
      selectedNodeIds: new Set(),
    })),

  clearSelection: () => set({ selectedNodeIds: new Set(), selectedEdgeIds: new Set() }),

  deleteSelected: () => {
    const state = get();
    const ids = [...state.selectedNodeIds];
    if (ids.length === 0 && state.selectedEdgeIds.size > 0) {
      state.pushHistory();
      set({
        edges: state.edges.filter((e) => !state.selectedEdgeIds.has(e.id)),
        selectedEdgeIds: new Set(),
      });
      return;
    }
    if (ids.length === 0) return;
    state.pushHistory();
    const edgeIdsToRemove = new Set<string>();
    state.edges.forEach((e) => {
      if (ids.includes(e.sourceNodeId) || ids.includes(e.targetNodeId)) {
        edgeIdsToRemove.add(e.id);
      }
    });
    set({
      nodes: state.nodes.filter((n) => !ids.includes(n.id)),
      edges: state.edges.filter((e) => !edgeIdsToRemove.has(e.id)),
      selectedNodeIds: new Set(),
    });
  },

  startDragNode: (id, clientPos) => {
    const node = get().nodes.find((n) => n.id === id);
    set({
      draggingNodeId: id,
      dragStartClient: clientPos,
      dragStartNodePos: node ? { ...node.position } : null,
    });
  },

  moveDragNode: (clientPos) => {
    const state = get();
    const id = state.draggingNodeId;
    if (!id || !state.dragStartClient || !state.dragStartNodePos) return;
    const node = state.nodes.find((n) => n.id === id);
    if (!node) return;
    const dx = (clientPos.x - state.dragStartClient.x) / state.viewport.zoom;
    const dy = (clientPos.y - state.dragStartClient.y) / state.viewport.zoom;
    let x = state.dragStartNodePos.x + dx;
    let y = state.dragStartNodePos.y + dy;
    if (state.snapToGrid) {
      x = snap(x, state.gridSize);
      y = snap(y, state.gridSize);
    }
    set({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, position: { x, y } } : n)),
    });
  },

  endDragNode: () => {
    const state = get();
    if (state.draggingNodeId) {
      state.pushHistory();
    }
    set({ draggingNodeId: null, dragStartClient: null, dragStartNodePos: null });
  },

  startConnect: (sourceNodeId, sourcePortId) => set({ connecting: { sourceNodeId, sourcePortId } }),

  endConnect: (targetNodeId, targetPortId) => {
    const state = get();
    if (!state.connecting) return;
    const { sourceNodeId, sourcePortId } = state.connecting;
    // prevent self-connection and duplicate connections
    if (sourceNodeId === targetNodeId) {
      set({ connecting: null });
      return;
    }
    const exists = state.edges.some(
      (e) =>
        e.sourceNodeId === sourceNodeId &&
        e.sourcePortId === sourcePortId &&
        e.targetNodeId === targetNodeId &&
        e.targetPortId === targetPortId
    );
    if (!exists) {
      state.pushHistory();
      set({
        edges: [
          ...state.edges,
          {
            id: `edge-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            sourceNodeId,
            sourcePortId,
            targetNodeId,
            targetPortId,
          },
        ],
        connecting: null,
      });
    } else {
      set({ connecting: null });
    }
  },

  cancelConnect: () => set({ connecting: null }),

  toggleSnap: () => set((s) => ({ snapToGrid: !s.snapToGrid })),

  pushHistory: () =>
    set((s) => {
      const next = s.history.slice(0, s.historyIndex + 1);
      next.push({ nodes: s.nodes, edges: s.edges });
      if (next.length > 50) next.shift();
      return { history: next, historyIndex: next.length - 1 };
    }),

  undo: () =>
    set((s) => {
      if (s.historyIndex <= 0) return s;
      const prev = s.history[s.historyIndex - 1];
      return {
        historyIndex: s.historyIndex - 1,
        nodes: prev.nodes,
        edges: prev.edges,
      };
    }),

  redo: () =>
    set((s) => {
      if (s.historyIndex >= s.history.length - 1) return s;
      const next = s.history[s.historyIndex + 1];
      return {
        historyIndex: s.historyIndex + 1,
        nodes: next.nodes,
        edges: next.edges,
      };
    }),

  setNodeTypes: (nodeTypes) => set({ nodeTypes }),

  importFlow: (nodes, edges) => {
    set({ nodes, edges, selectedNodeIds: new Set(), selectedEdgeIds: new Set() });
    get().pushHistory();
  },

  reset: () =>
    set({
      nodes: [],
      edges: [],
      selectedNodeIds: new Set(),
      selectedEdgeIds: new Set(),
      viewport: initialViewport,
      history: [],
      historyIndex: -1,
      connecting: null,
      draggingNodeId: null,
      dragStartClient: null,
      dragStartNodePos: null,
    }),
}));
