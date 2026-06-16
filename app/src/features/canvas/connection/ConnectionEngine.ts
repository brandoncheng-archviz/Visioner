export type ConnectionState =
  | 'IDLE'
  | 'START'
  | 'DRAWING'
  | 'VALID_HIT'
  | 'INVALID_HIT'
  | 'EMPTY_SPACE'
  | 'COMPLETE';

export type ConnectionHandleType = 'source' | 'target';

export type ConnectionContext = {
  sourceNodeId: string | null;
  sourceHandle: string | null;
  sourceType: ConnectionHandleType | null;
  targetNodeId: string | null;
  targetHandle: string | null;
  targetType: ConnectionHandleType | null;
  mousePosition: { x: number; y: number } | null;
  rejectReason: string | null;
};

type StartEvent = {
  type: 'START';
  payload: {
    sourceNodeId: string;
    sourceHandle: string;
    sourceType: ConnectionHandleType;
  };
};

type MoveEvent = {
  type: 'MOVE';
  payload: { x: number; y: number };
};

type HitNodeEvent = {
  type: 'HIT_NODE';
  payload: {
    targetNodeId: string;
    targetHandle: string | null;
    targetType: ConnectionHandleType | null;
    isValid?: boolean;
    rejectReason?: string | null;
  };
};

type HitEmptyEvent = {
  type: 'HIT_EMPTY';
  payload: { x: number; y: number };
};

type EndEvent = {
  type: 'END';
};

type ResetEvent = {
  type: 'RESET';
};

export type ConnectionEvent =
  | StartEvent
  | MoveEvent
  | HitNodeEvent
  | HitEmptyEvent
  | EndEvent
  | ResetEvent;

export type ConnectionAction =
  | {
      type: 'CREATE_EDGE';
      payload: ConnectionContext;
    }
  | {
      type: 'OPEN_CREATE_MENU';
      payload: ConnectionContext;
    }
  | {
      type: 'REJECT_CONNECTION';
      payload: ConnectionContext;
    }
  | {
      type: 'RESET';
    };

const EMPTY_CONTEXT: ConnectionContext = {
  sourceNodeId: null,
  sourceHandle: null,
  sourceType: null,
  targetNodeId: null,
  targetHandle: null,
  targetType: null,
  mousePosition: null,
  rejectReason: null,
};

export class ConnectionEngine {
  private state: ConnectionState = 'IDLE';

  private context: ConnectionContext = { ...EMPTY_CONTEXT };

  dispatch(event: ConnectionEvent): ConnectionAction | null {
    switch (event.type) {
      case 'START': {
        this.state = 'START';
        this.context = {
          ...EMPTY_CONTEXT,
          sourceNodeId: event.payload.sourceNodeId,
          sourceHandle: event.payload.sourceHandle,
          sourceType: event.payload.sourceType,
        };
        this.state = 'DRAWING';
        return null;
      }

      case 'MOVE': {
        if (this.state === 'IDLE' || this.state === 'COMPLETE') return null;
        this.context = {
          ...this.context,
          mousePosition: event.payload,
        };
        if (this.state === 'VALID_HIT' || this.state === 'INVALID_HIT' || this.state === 'EMPTY_SPACE') {
          this.state = 'DRAWING';
        }
        return null;
      }

      case 'HIT_NODE': {
        if (this.state === 'IDLE' || this.state === 'COMPLETE') return null;
        const isValid = event.payload.isValid !== false;
        this.context = {
          ...this.context,
          targetNodeId: event.payload.targetNodeId,
          targetHandle: event.payload.targetHandle,
          targetType: event.payload.targetType,
          rejectReason: isValid ? null : event.payload.rejectReason ?? null,
        };
        this.state = isValid ? 'VALID_HIT' : 'INVALID_HIT';
        return null;
      }

      case 'HIT_EMPTY': {
        if (this.state === 'IDLE' || this.state === 'COMPLETE') return null;
        this.context = {
          ...this.context,
          targetNodeId: null,
          targetHandle: null,
          targetType: null,
          mousePosition: event.payload,
          rejectReason: null,
        };
        this.state = 'EMPTY_SPACE';
        return null;
      }

      case 'END': {
        const action = this.getEndAction();
        this.state = 'COMPLETE';
        return action;
      }

      case 'RESET': {
        this.reset();
        return { type: 'RESET' };
      }

      default:
        return null;
    }
  }

  getContext(): ConnectionContext {
    return { ...this.context };
  }

  reset() {
    this.state = 'IDLE';
    this.context = { ...EMPTY_CONTEXT };
  }

  private getEndAction(): ConnectionAction {
    const context = this.getContext();
    if (this.state === 'VALID_HIT') {
      return { type: 'CREATE_EDGE', payload: context };
    }
    if (this.state === 'EMPTY_SPACE') {
      return { type: 'OPEN_CREATE_MENU', payload: context };
    }
    if (this.state === 'INVALID_HIT') {
      return { type: 'REJECT_CONNECTION', payload: context };
    }
    return { type: 'REJECT_CONNECTION', payload: context };
  }
}
