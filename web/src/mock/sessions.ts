/**
 * 仅用于界面展示的静态数据。接入后端后删除本文件，改由 api/ 层提供。
 */
import type { SessionDetail, SessionSummary, HttpMethod, ResourceType } from '../types';

const BASE = Date.now() - 1000 * 60 * 3;

type Seed = [HttpMethod, string, string, number | undefined, ResourceType, string, number, number, number | undefined, string, Partial<SessionSummary>?];

// [method, scheme://host, path, status, type, mime, reqSize, resSize, duration, clientIp, extra]
const seeds: Seed[] = [
  ['GET', 'https://www.example.com', '/', 200, 'doc', 'text/html', 512, 48210, 182, '127.0.0.1'],
  ['GET', 'https://static.example.com', '/assets/app.8f3a1c.js', 200, 'js', 'application/javascript', 420, 382014, 96, '127.0.0.1'],
  ['GET', 'https://static.example.com', '/assets/app.2b91e0.css', 200, 'css', 'text/css', 418, 64210, 71, '127.0.0.1'],
  ['GET', 'https://api.example.com', '/v1/user/info', 200, 'xhr', 'application/json', 640, 1240, 12, '192.168.1.42', { mocked: true, hits: 1 }],
  ['POST', 'https://api.example.com', '/v1/order/create', 201, 'xhr', 'application/json', 1832, 412, 238, '192.168.1.42', { remapped: true, hits: 2 }],
  ['GET', 'https://api.example.com', '/v1/order/10086', 200, 'xhr', 'application/json', 610, 2210, 318, '192.168.1.42', { mocked: true, hits: 1 }],
  ['GET', 'https://img.example.com', '/banner/2026-autumn.webp', 200, 'img', 'image/webp', 380, 184320, 142, '192.168.1.42'],
  ['OPTIONS', 'https://api.example.com', '/v1/cart', 204, 'xhr', 'text/plain', 480, 0, 34, '192.168.1.42', { hits: 1 }],
  ['GET', 'https://api.example.com', '/v1/cart', 200, 'xhr', 'application/json', 702, 5402, 88, '192.168.1.42'],
  ['POST', 'https://api.example.com', '/v1/pay/submit', 500, 'xhr', 'application/json', 920, 188, 2040, '192.168.1.42', { hits: 2 }],
  ['GET', 'wss://ws.example.com', '/realtime?token=•••', 101, 'ws', 'websocket', 610, 0, undefined, '192.168.1.42', { proto: 'WebSocket', state: 'pending' }],
  ['CONNECT', 'https://apple.com', '', undefined, 'other', '', 0, 0, 12020, '192.168.1.42', { state: 'tunnel', proto: 'TCP' }],
  ['GET', 'https://fonts.example.net', '/inter/v4/Inter-Regular.woff2', 200, 'font', 'font/woff2', 390, 98320, 64, '127.0.0.1'],
  ['GET', 'https://cdn.example.com', '/video/intro-720p.mp4', 206, 'media', 'video/mp4', 412, 2097152, 1840, '127.0.0.1', { throttled: true, hits: 1 }],
  ['GET', 'https://analytics.example.org', '/collect?v=2&tid=G-XXXX', 200, 'xhr', 'image/gif', 820, 43, 22, '127.0.0.1'],
  ['GET', 'https://ads.example.org', '/pixel.js', undefined, 'js', '', 402, 0, 1, '127.0.0.1', { state: 'aborted', hits: 1 }],
  ['GET', 'https://api.example.com', '/v1/feed?page=2', 304, 'xhr', 'application/json', 802, 0, 41, '192.168.1.57'],
  ['PUT', 'https://api.example.com', '/v1/user/profile', 200, 'xhr', 'application/json', 1402, 610, 162, '192.168.1.57'],
  ['DELETE', 'https://api.example.com', '/v1/cart/items/8812', 404, 'xhr', 'application/json', 540, 96, 58, '192.168.1.57'],
  ['PATCH', 'https://api.example.com', '/v1/settings', 200, 'xhr', 'application/json', 612, 220, 77, '192.168.1.57'],
  ['GET', 'http://localhost:3000', '/api/debug/health', 200, 'xhr', 'application/json', 340, 64, 3, '127.0.0.1'],
  ['GET', 'https://api.example.com', '/v1/search?q=%E5%92%96%E5%95%A1', undefined, 'xhr', '', 740, 0, undefined, '192.168.1.57', { state: 'pending' }],
  ['POST', 'https://api.example.com', '/v1/upload/avatar', undefined, 'xhr', '', 284120, 0, undefined, '192.168.1.57', { state: 'paused', hits: 1 }],
  ['GET', 'https://legacy.example.com', '/api/v0/config', undefined, 'xhr', '', 480, 0, 30012, '192.168.1.57', { state: 'error' }],
  ['GET', 'https://www.example.com', '/favicon.ico', 200, 'img', 'image/x-icon', 360, 4286, 18, '127.0.0.1'],
  ['GET', 'https://static.example.com', '/assets/vendor.c01d77.js', 200, 'js', 'application/javascript', 420, 812044, 212, '127.0.0.1'],
  ['GET', 'https://api.example.com', '/v1/notice/unread', 200, 'xhr', 'application/json', 612, 88, 26, '127.0.0.1'],
  ['POST', 'https://api.example.com', '/graphql', 200, 'xhr', 'application/json', 2210, 14820, 196, '127.0.0.1'],
  ['GET', 'https://img.example.com', '/avatar/u_48213.png', 200, 'img', 'image/png', 372, 22184, 54, '127.0.0.1'],
  ['GET', 'https://api.example.com', '/v1/recommend?scene=home', 200, 'xhr', 'application/json', 690, 18422, 402, '192.168.1.42'],
];

export const mockSessions: SessionSummary[] = [];
for (let r = 0; r < 4; r++) {
  seeds.forEach((s, i) => {
    const [method, origin, path, status, type, mime, reqSize, resSize, duration, clientIp, extra] = s;
    const url = new URL(origin);
    const id = r * seeds.length + i + 1;
    mockSessions.push({
      id,
      clientIp,
      method,
      scheme: url.protocol.replace(':', '') as SessionSummary['scheme'],
      host: url.host,
      path,
      proto: url.protocol === 'http:' ? 'HTTP/1.1' : 'HTTP/2',
      status,
      type,
      mime,
      reqSize,
      resSize,
      startedAt: BASE + id * 1370,
      duration,
      state: 'done',
      hits: 0,
      ...extra,
    });
  });
}

const userJson = JSON.stringify(
  {
    code: 0,
    message: 'ok',
    data: {
      uid: 48213,
      nickname: '测试用户',
      avatar: 'https://img.example.com/avatar/u_48213.png',
      vip: { level: 3, expireAt: '2027-01-01T00:00:00Z' },
      tags: ['beta', 'internal'],
      verified: true,
      balance: 128.5,
      lastLogin: null,
    },
  },
  null,
  2,
);

/** 根据摘要拼一个像样的详情，用于展示详情面板 */
export function getMockDetail(id: number): SessionDetail | undefined {
  const s = mockSessions.find((x) => x.id === id);
  if (!s) return undefined;
  const url = `${s.scheme}://${s.host}${s.path}`;
  const isWs = s.type === 'ws';
  const isJson = s.mime === 'application/json';

  return {
    ...s,
    url,
    httpVersion: s.proto === 'HTTP/2' ? 'HTTP/2.0' : 'HTTP/1.1',
    remoteAddr: s.mocked ? undefined : '93.184.216.34:443',
    finalUrl: s.remapped ? `http://localhost:3000${s.path.replace('/v1', '/api')}` : undefined,
    statusText: s.status === 200 ? 'OK' : s.status === 201 ? 'Created' : s.status === 500 ? 'Internal Server Error' : undefined,
    device: s.clientIp === '127.0.0.1' ? '本机 · Chrome 141' : s.clientIp === '192.168.1.42' ? 'iPhone 16 · iOS 26' : 'Pixel 9 · Android 16',
    error: s.state === 'error' ? 'dial tcp 10.2.3.4:443: i/o timeout (30s)' : undefined,
    reqHeaders: [
      { name: ':authority', value: s.host },
      { name: 'user-agent', value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148' },
      { name: 'accept', value: isJson ? 'application/json, text/plain, */*' : '*/*' },
      { name: 'accept-encoding', value: 'gzip, deflate, br, zstd' },
      { name: 'accept-language', value: 'zh-CN,zh;q=0.9,en;q=0.8' },
      { name: 'authorization', value: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOjQ4MjEzfQ.s1gN4tUr3' },
      { name: 'cookie', value: 'sid=8f0c2a9e41; theme=dark; ab_group=B' },
      { name: 'x-request-id', value: 'c7d1e3f0-5a2b-4d8e-9f10-2b3c4d5e6f70' },
      ...(s.method === 'POST' || s.method === 'PUT' ? [{ name: 'content-type', value: 'application/json;charset=UTF-8' }] : []),
    ],
    resHeaders: s.status
      ? [
          { name: 'content-type', value: s.mime ? `${s.mime}; charset=utf-8` : 'text/plain' },
          { name: 'content-length', value: String(s.resSize) },
          { name: 'content-encoding', value: 'br' },
          { name: 'cache-control', value: 'no-cache, private' },
          { name: 'date', value: new Date(s.startedAt).toUTCString() },
          { name: 'server', value: s.mocked ? 'Charstle (mock)' : 'nginx' },
          { name: 'access-control-allow-origin', value: '*' },
          { name: 'x-trace-id', value: '7f3a9b2c11d04e8a' },
        ]
      : [],
    reqBody:
      s.method === 'POST' || s.method === 'PUT' || s.method === 'PATCH'
        ? {
            kind: 'json',
            mime: 'application/json',
            size: s.reqSize,
            text: JSON.stringify({ skuId: 10086, count: 2, coupon: 'AUTUMN26', address: { city: '上海', detail: '某某路 88 号' } }, null, 2),
          }
        : undefined,
    resBody: !s.status
      ? undefined
      : isJson
        ? { kind: 'json', mime: 'application/json', size: s.resSize, decodedSize: s.resSize * 3, encoding: 'br', text: userJson }
        : s.type === 'img'
          ? { kind: 'image', mime: s.mime ?? 'image/png', size: s.resSize, previewUrl: '' }
          : s.type === 'doc'
            ? { kind: 'html', mime: 'text/html', size: s.resSize, encoding: 'gzip', text: '<!doctype html>\n<html lang="zh-CN">\n  <head>\n    <meta charset="utf-8" />\n    <title>Example</title>\n  </head>\n  <body>\n    <div id="app"></div>\n  </body>\n</html>' }
            : s.type === 'js'
              ? { kind: 'text', mime: 'application/javascript', size: s.resSize, truncated: s.resSize > 500000, text: '(()=>{"use strict";var e={};function t(n){return e[n]||(e[n]={exports:{}}),e[n].exports}/* … */})();' }
              : { kind: 'binary', mime: s.mime ?? 'application/octet-stream', size: s.resSize, text: 'GIF89a\u0001\u0000\u0001\u0000\u0080\u0000\u0000ÿÿÿ' },
    timing: s.mocked
      ? { blocked: 0.4, wait: 1.2, receive: 0.3 }
      : { blocked: 1.8, dns: 12.4, connect: 28.1, tls: 41.6, send: 0.6, wait: Math.max(10, (s.duration ?? 100) - 110), receive: 22.3 },
    tls:
      s.scheme === 'https' || s.scheme === 'wss'
        ? {
            version: 'TLS 1.3',
            cipher: 'TLS_AES_128_GCM_SHA256',
            sni: s.host,
            alpn: s.proto === 'HTTP/2' ? 'h2' : 'http/1.1',
            intercepted: s.state !== 'tunnel',
            serverCert: { subject: `CN=${s.host}`, issuer: 'CN=R11, O=Let\'s Encrypt', notAfter: '2026-12-18' },
          }
        : undefined,
    ruleHits:
      s.hits > 0
        ? [
            s.mocked
              ? { ruleId: 'r3', group: '联调环境', line: 6, pattern: 'api.example.com/v1/user/info', action: 'mock', value: '{userInfo}', phase: 'request' }
              : s.remapped
                ? { ruleId: 'r2', group: '联调环境', line: 3, pattern: 'api.example.com/v1/order/', action: 'mapRemote', value: 'http://localhost:3000/api/order/', phase: 'request' }
                : { ruleId: 'r7', group: '异常模拟', line: 4, pattern: 'api.example.com/v1/pay', action: 'statusCode', value: '500', phase: 'response' },
            ...(s.hits > 1
              ? [{ ruleId: 'r5', group: '通用', line: 2, pattern: '*.example.com', action: 'resHeaders', value: '{cors}', phase: 'response' as const }]
              : []),
          ]
        : [],
    frames: isWs
      ? Array.from({ length: 24 }, (_, i) => ({
          id: i + 1,
          dir: i % 3 === 0 ? ('out' as const) : ('in' as const),
          opcode: i === 23 ? ('ping' as const) : ('text' as const),
          size: 40 + ((i * 37) % 300),
          time: s.startedAt + i * 820,
          data:
            i % 3 === 0
              ? JSON.stringify({ op: 'subscribe', channel: `ticker.${i}` })
              : JSON.stringify({ ch: `ticker.${i - 1}`, ts: s.startedAt + i * 820, price: (100 + i * 1.37).toFixed(2), vol: i * 12 }),
        }))
      : undefined,
  };
}
