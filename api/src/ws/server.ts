import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'node:events';
import type { Server } from 'node:http';

export type Channel = 'robots' | 'intent' | 'capability';

export interface ChannelEvent {
  channel: Channel;
  type: string;
  data: unknown;
  ts: number;
}

// Process-wide bus; route handlers and listeners publish, WS clients subscribe.
export const bus = new EventEmitter();

export function publish(channel: Channel, type: string, data: unknown): void {
  const evt: ChannelEvent = { channel, type, data, ts: Date.now() };
  bus.emit('event', evt);
}

/** Attach a WS server at /ws. Clients send {"subscribe":["robots","intent"]}. */
export function attachWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    const subscriptions = new Set<Channel>(['robots', 'intent', 'capability']);

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (Array.isArray(msg.subscribe)) {
          subscriptions.clear();
          for (const c of msg.subscribe) subscriptions.add(c);
          ws.send(JSON.stringify({ type: 'subscribed', channels: [...subscriptions] }));
        }
      } catch {
        ws.send(JSON.stringify({ type: 'error', error: 'invalid message' }));
      }
    });

    const handler = (evt: ChannelEvent) => {
      if (subscriptions.has(evt.channel) && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(evt));
      }
    };
    bus.on('event', handler);
    ws.on('close', () => bus.off('event', handler));

    ws.send(JSON.stringify({ type: 'connected', channels: [...subscriptions] }));
  });

  return wss;
}
