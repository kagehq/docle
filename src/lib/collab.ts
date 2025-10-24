import { DurableObject } from "cloudflare:workers";

export interface CollabMessage {
  type: 'join' | 'leave' | 'update' | 'cursor' | 'sync';
  userId: string;
  data?: any;
  timestamp?: number;
}

export interface CollabState {
  code: string;
  lang: string;
  users: Map<string, { name: string; cursor?: number; color: string }>;
  lastUpdate: number;
}

/**
 * Durable Object for managing collaborative editing sessions
 */
export class CollabSession extends DurableObject {
  private state: CollabState;
  private connections: Map<WebSocket, string>; // ws -> userId

  constructor(ctx: DurableObjectState, env: any) {
    super(ctx, env);
    this.state = {
      code: '',
      lang: 'python',
      users: new Map(),
      lastUpdate: Date.now()
    };
    this.connections = new Map();
    
    // Load persisted state
    this.ctx.blockConcurrencyWhile(async () => {
      const stored = await this.ctx.storage.get<CollabState>('state');
      if (stored) {
        this.state = {
          ...stored,
          users: new Map(Object.entries(stored.users || {}))
        };
      }
    });
  }

  /**
   * Handle WebSocket connections
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    if (url.pathname === '/websocket') {
      // WebSocket upgrade
      const upgradeHeader = request.headers.get('Upgrade');
      if (upgradeHeader !== 'websocket') {
        return new Response('Expected WebSocket', { status: 426 });
      }

      const webSocketPair = new WebSocketPair();
      const [client, server] = Object.values(webSocketPair);

      this.handleSession(server);

      return new Response(null, {
        status: 101,
        webSocket: client
      });
    }

    // HTTP endpoints for state queries
    if (url.pathname === '/state') {
      return Response.json({
        code: this.state.code,
        lang: this.state.lang,
        users: Array.from(this.state.users.entries()).map(([id, user]) => ({
          id,
          ...user
        })),
        connections: this.connections.size
      });
    }

    return new Response('Not found', { status: 404 });
  }

  /**
   * Handle WebSocket session
   */
  private async handleSession(ws: WebSocket) {
    ws.accept();

    const userId = crypto.randomUUID();
    this.connections.set(ws, userId);

    // Send initial state to new user
    const colors = ['#8aa2ff', '#51cf66', '#ff6b6b', '#ffd93d', '#a78bfa'];
    const userColor = colors[this.state.users.size % colors.length];
    
    this.state.users.set(userId, {
      name: `User ${this.state.users.size + 1}`,
      color: userColor
    });

    ws.send(JSON.stringify({
      type: 'init',
      userId,
      data: {
        code: this.state.code,
        lang: this.state.lang,
        users: Array.from(this.state.users.entries()).map(([id, user]) => ({
          id,
          ...user
        }))
      }
    }));

    // Notify others
    this.broadcast({
      type: 'join',
      userId,
      data: { name: this.state.users.get(userId)!.name, color: userColor }
    }, ws);

    // Handle messages
    ws.addEventListener('message', async (event) => {
      try {
        const msg: CollabMessage = JSON.parse(event.data as string);
        await this.handleMessage(ws, userId, msg);
      } catch (e) {
        console.error('Invalid message:', e);
      }
    });

    // Handle disconnect
    ws.addEventListener('close', () => {
      this.connections.delete(ws);
      this.state.users.delete(userId);
      this.broadcast({
        type: 'leave',
        userId
      });
    });
  }

  /**
   * Handle incoming messages
   */
  private async handleMessage(ws: WebSocket, userId: string, msg: CollabMessage) {
    switch (msg.type) {
      case 'update':
        // Update code
        this.state.code = msg.data.code || this.state.code;
        this.state.lang = msg.data.lang || this.state.lang;
        this.state.lastUpdate = Date.now();
        
        // Persist state
        await this.ctx.storage.put('state', {
          ...this.state,
          users: Object.fromEntries(this.state.users.entries())
        });

        // Broadcast to others
        this.broadcast({
          type: 'update',
          userId,
          data: msg.data,
          timestamp: this.state.lastUpdate
        }, ws);
        break;

      case 'cursor':
        // Update cursor position
        const user = this.state.users.get(userId);
        if (user) {
          user.cursor = msg.data.cursor;
          this.broadcast({
            type: 'cursor',
            userId,
            data: { cursor: msg.data.cursor }
          }, ws);
        }
        break;

      case 'sync':
        // Request current state
        ws.send(JSON.stringify({
          type: 'sync',
          data: {
            code: this.state.code,
            lang: this.state.lang,
            timestamp: this.state.lastUpdate
          }
        }));
        break;
    }
  }

  /**
   * Broadcast message to all connections except sender
   */
  private broadcast(msg: CollabMessage, exclude?: WebSocket) {
    const payload = JSON.stringify(msg);
    for (const [ws, _] of this.connections) {
      if (ws !== exclude) {
        try {
          ws.send(payload);
        } catch (e) {
          console.error('Failed to send to client:', e);
        }
      }
    }
  }
}

