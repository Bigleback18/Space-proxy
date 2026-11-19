import { WebSocketServer, WebSocket } from 'ws';
import { lookup } from 'node:dns/promises';
import { connect } from 'node:net';
import ipaddr from 'ipaddr.js';

export async function resolvePublicHost(hostname) {
  const addresses = await lookup(hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => ipaddr.process(address).range() !== 'unicast')) {
    throw new Error('Destination is not a public website');
  }
  return addresses[0];
}

// Wisp v1 carries browser HTTP(S) connections; only public web ports are allowed.
export function attachBrowsing(server) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 1024 * 1024 });
  server.on('upgrade', (request, socket, head) => {
    const protocol = request.headers['x-forwarded-proto'] === 'https' ? 'https:' : 'http:';
    const origin = request.headers.origin;
    if (request.url !== '/wisp/' || !origin || ![`${protocol}//${request.headers.host}`, `https://${request.headers.host}`].includes(origin)) {
      socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
      return;
    }
    wss.handleUpgrade(request, socket, head, ws => {
      const streams = new Map();
      const send = (type, id, payload = Buffer.alloc(0)) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const header = Buffer.alloc(5);
        header[0] = type;
        header.writeUInt32LE(id, 1);
        ws.send(Buffer.concat([header, payload]));
      };
      const credit = Buffer.alloc(4);
      credit.writeUInt32LE(128);
      send(3, 0, credit);
      const close = (id, reason) => {
        const stream = streams.get(id);
        streams.delete(id);
        stream?.socket?.destroy();
        send(4, id, Buffer.from([reason]));
      };
      ws.on('message', async (data, binary) => {
        if (!binary || data.length < 5) return ws.close(1002);
        const type = data[0], id = data.readUInt32LE(1), payload = data.subarray(5);
        if (type === 1) {
          if (payload.length < 4 || streams.has(id) || streams.size >= 64) return close(id, 0x41);
          const port = payload.readUInt16LE(1);
          if (payload[0] !== 1 || ![80, 443].includes(port)) return close(id, 0x41);
          const stream = { pending: [], bytes: 0, packets: 0, socket: null, connected: false };
          streams.set(id, stream);
          try {
            const address = await resolvePublicHost(payload.subarray(3).toString());
            if (streams.get(id) !== stream || ws.readyState !== WebSocket.OPEN) return;
            // Pin the validated DNS result so a second resolution cannot reach a private address.
            const upstream = connect({ host: address.address, family: address.family, port });
            stream.socket = upstream;
            upstream.setTimeout(60000, () => close(id, 0x02));
            upstream.on('connect', () => {
              stream.connected = true;
              for (const packet of stream.pending) upstream.write(packet);
              stream.pending = [];
            });
            upstream.on('data', chunk => {
              if (ws.bufferedAmount > 8 * 1024 * 1024) return close(id, 0x02);
              send(2, id, chunk);
            });
            upstream.on('error', () => close(id, 0x43));
            upstream.on('close', () => { if (streams.has(id)) close(id, 0x02); });
          } catch { close(id, 0x42); }
        } else if (type === 2) {
          const stream = streams.get(id);
          if (!stream) return;
          if (stream.connected) stream.socket.write(payload);
          else {
            stream.bytes += payload.length;
            if (stream.bytes > 1024 * 1024) return close(id, 0x41);
            stream.pending.push(payload);
          }
          if (++stream.packets % 64 === 0) send(3, id, credit);
        } else if (type === 4) {
          const stream = streams.get(id);
          streams.delete(id);
          stream?.socket?.destroy();
        }
      });
      ws.on('error', () => ws.close());
      ws.on('close', () => {
        for (const stream of streams.values()) stream.socket?.destroy();
        streams.clear();
      });
    });
  });
}
