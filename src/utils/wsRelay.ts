export type WsRelayStatus = 'SUBSCRIBED' | 'CLOSED' | 'ERROR';

export interface WsRelayMember {
  memberId: string;
  username?: string;
}

export interface WsRelayOptions {
  memberId: string;
  username?: string;
}

type EventHandler = (payload: any, meta?: { fromMemberId?: string }) => void;

export function getGameWsUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

export class WsRoomChannel {
  private channelName: string;
  private memberId: string;
  private username: string;
  private ws: WebSocket | null = null;
  private handlers: Map<string, EventHandler[]> = new Map();
  private statusCallback: ((status: WsRelayStatus, meta?: { members?: WsRelayMember[] }) => void) | null = null;
  private pendingQueue: Array<{ event: string; payload: any; includeSelf?: boolean }> = [];
  private isJoined = false;
  private isClosed = false;
  private pingTimer: ReturnType<typeof setInterval> | null = null;

  constructor(channelName: string, options: WsRelayOptions) {
    this.channelName = channelName;
    this.memberId = options.memberId;
    this.username = options.username || 'Player';
  }

  on(event: string, handler: EventHandler): this {
    const list = this.handlers.get(event) || [];
    list.push(handler);
    this.handlers.set(event, list);
    return this;
  }

  private emitLocal(event: string, payload: any, meta?: { fromMemberId?: string }) {
    const list = this.handlers.get(event);
    if (!list) return;
    list.forEach((fn) => {
      try {
        fn(payload, meta);
      } catch (e) {
        console.error('WsRoomChannel handler error:', e);
      }
    });
  }

  subscribe(callback?: (status: WsRelayStatus, meta?: { members?: WsRelayMember[] }) => void): this {
    if (callback) {
      this.statusCallback = callback;
    }
    this.isClosed = false;

    try {
      const ws = new WebSocket(getGameWsUrl());
      this.ws = ws;

      ws.onopen = () => {
        if (this.isClosed) {
          ws.close();
          return;
        }
        ws.send(
          JSON.stringify({
            type: 'relay_join',
            channel: this.channelName,
            memberId: this.memberId,
            username: this.username,
          })
        );

        if (this.pingTimer) clearInterval(this.pingTimer);
        this.pingTimer = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 20000);
      };

      ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          if (!data || data.type === 'pong') return;

          if (data.type === 'relay_joined' && data.channel === this.channelName) {
            this.isJoined = true;
            while (this.pendingQueue.length > 0) {
              const queued = this.pendingQueue.shift()!;
              this.sendImmediate(queued.event, queued.payload, queued.includeSelf);
            }
            this.statusCallback?.('SUBSCRIBED', { members: data.members || [] });
          } else if (data.type === 'relay_event' && data.channel === this.channelName) {
            this.emitLocal(data.event, data.payload, { fromMemberId: data.fromMemberId });
          } else if (data.type === 'relay_member_joined' && data.channel === this.channelName) {
            this.emitLocal('relay_member_joined', {
              memberId: data.memberId,
              username: data.username,
            });
          } else if (data.type === 'relay_member_left' && data.channel === this.channelName) {
            this.emitLocal('relay_member_left', {
              memberId: data.memberId,
              username: data.username,
            });
          }
        } catch (err) {
          console.error('WsRoomChannel message parse error:', err);
        }
      };

      ws.onerror = () => {
        if (!this.isClosed && !this.isJoined) {
          this.statusCallback?.('ERROR');
        }
      };

      ws.onclose = () => {
        if (this.pingTimer) {
          clearInterval(this.pingTimer);
          this.pingTimer = null;
        }
        const wasJoined = this.isJoined;
        this.isJoined = false;
        if (!this.isClosed) {
          this.statusCallback?.(wasJoined ? 'CLOSED' : 'ERROR');
        }
      };
    } catch (err) {
      console.error('WsRoomChannel init error:', err);
      this.statusCallback?.('ERROR');
    }

    return this;
  }

  private sendImmediate(event: string, payload: any, includeSelf = false) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(
      JSON.stringify({
        type: 'relay_broadcast',
        channel: this.channelName,
        event,
        payload,
        includeSelf,
      })
    );
  }

  send(msg: { type?: string; event: string; payload?: any; includeSelf?: boolean }) {
    const event = msg.event;
    const payload = msg.payload !== undefined ? msg.payload : {};
    const includeSelf = !!msg.includeSelf;
    if (this.isClosed) return;

    if (!this.isJoined || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.pendingQueue.push({ event, payload, includeSelf });
      return;
    }
    this.sendImmediate(event, payload, includeSelf);
  }

  unsubscribe() {
    this.isClosed = true;
    this.isJoined = false;
    this.pendingQueue = [];
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.ws) {
      try {
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'relay_leave', channel: this.channelName }));
        }
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.handlers.clear();
  }
}

export function createWsRoomChannel(channelName: string, options: WsRelayOptions): WsRoomChannel {
  return new WsRoomChannel(channelName, options);
}
