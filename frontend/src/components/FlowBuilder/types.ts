export interface PortDef {
  id: string;
  type: 'input' | 'output';
  label?: string;
}

export interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  data: Record<string, any>;
  ports: PortDef[];
  label?: string;
}

export interface FlowEdge {
  id: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface NodeTypeDef {
  type: string;
  label: string;
  category: string;
  icon?: string;
  color: string;
  bg: string;
  border: string;
  defaultSize: { width: number; height: number };
  defaultPorts: PortDef[];
  defaultData: Record<string, any>;
  fields: NodeField[];
}

export interface NodeField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'checkbox' | 'json';
  options?: string[];
  placeholder?: string;
}

export interface Point {
  x: number;
  y: number;
}
