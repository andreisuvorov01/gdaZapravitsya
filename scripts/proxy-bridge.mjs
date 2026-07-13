// Локальный HTTP↔SOCKS5 мост: поднимает по одному локальному
// не-авторизованному HTTP CONNECT-прокси (127.0.0.1:PORT) на каждый прокси
// из PROXY_LIST — каждый мост сам логинится на реальный SOCKS5-прокси
// логином/паролем и прозрачно туннелирует трафик дальше.
//
// Зачем: Chromium (а значит и Playwright, "browser"-транспорт синка) не
// умеет проходить авторизацию на SOCKS5-прокси — это ограничение самого
// браузера ("Browser does not support socks5 proxy authentication"), не
// нашего кода. Мост обходит это: браузер видит локальный HTTP-прокси БЕЗ
// авторизации (это Chromium прекрасно умеет), а настоящий логин/пароль на
// SOCKS5 остаётся полностью на стороне моста.
//
// Запуск (отдельным процессом, по необходимости — держать открытым, пока
// идёт синк с PROXY_BRIDGE=1):
//   node scripts/proxy-bridge.mjs
//
// Порт для прокси PROXY_LIST[i] — PROXY_BRIDGE_BASE_PORT + i (по умолчанию
// база 18080). scripts/lib/gdebenz-http.mjs вычисляет тот же порт по той же
// формуле, так что дополнительной синхронизации портов не требуется — просто
// не меняйте PROXY_LIST между запуском моста и запуском синка.

import { createServer } from "node:http";
import { SocksClient } from "socks";
import { loadEnv } from "./load-env.mjs";
import { PROXY_POOL } from "./lib/gdebenz-http.mjs";

loadEnv();

const BASE_PORT = Math.max(1, Number(process.env.PROXY_BRIDGE_BASE_PORT) || 18080);

function parseSocksProxy(proxyUrl) {
  const u = new URL(proxyUrl);
  if (!/^socks[45]?h?:$/i.test(u.protocol)) {
    throw new Error(`Не SOCKS-прокси (мост нужен только для SOCKS5): ${u.protocol}//${u.hostname}:${u.port}`);
  }
  return {
    host: u.hostname,
    port: Number(u.port),
    type: /^socks4/i.test(u.protocol) ? 4 : 5,
    userId: u.username ? decodeURIComponent(u.username) : undefined,
    password: u.password ? decodeURIComponent(u.password) : undefined,
  };
}

/** Один локальный HTTP CONNECT-мост → один upstream SOCKS5-прокси. */
function startBridge(localPort, upstreamProxyUrl) {
  const socksProxy = parseSocksProxy(upstreamProxyUrl);
  const server = createServer((req, res) => {
    // Обычные (не-CONNECT) запросы мост не обслуживает — синк ходит только
    // по HTTPS, т.е. только через CONNECT-туннель.
    res.writeHead(405).end("Only CONNECT is supported by this bridge");
  });

  server.on("connect", async (req, clientSocket, head) => {
    const [host, portStr] = req.url.split(":");
    const port = Number(portStr) || 443;
    clientSocket.on("error", () => {});
    try {
      const { socket } = await SocksClient.createConnection({
        proxy: socksProxy,
        command: "connect",
        destination: { host, port },
        timeout: 15000,
      });
      socket.on("error", () => clientSocket.destroy());
      clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
      if (head?.length) socket.write(head);
      socket.pipe(clientSocket);
      clientSocket.pipe(socket);
    } catch (e) {
      clientSocket.end(`HTTP/1.1 502 Bad Gateway\r\n\r\n${e.message}`);
    }
  });

  server.listen(localPort, "127.0.0.1");
  return server;
}

function redact(proxyUrl) {
  try {
    const u = new URL(proxyUrl);
    return `${u.protocol}//${u.hostname}:${u.port}`;
  } catch {
    return "<не парсится>";
  }
}

async function main() {
  if (PROXY_POOL.length === 0) {
    console.log("PROXY_LIST/PROXY_URL не заданы в .env — мостить нечего.");
    process.exit(1);
  }

  const servers = [];
  for (let i = 0; i < PROXY_POOL.length; i++) {
    const localPort = BASE_PORT + i;
    try {
      servers.push(startBridge(localPort, PROXY_POOL[i]));
      console.log(`Мост #${i + 1}/${PROXY_POOL.length}: http://127.0.0.1:${localPort} → ${redact(PROXY_POOL[i])}`);
    } catch (e) {
      console.warn(`Мост #${i + 1}/${PROXY_POOL.length} не запущен: ${e.message}`);
    }
  }

  console.log(
    `\nГотово: ${servers.length} мост(ов) слушают 127.0.0.1:${BASE_PORT}-${BASE_PORT + PROXY_POOL.length - 1}.\n` +
      `Запускайте синк с PROXY_BRIDGE=1 в этом же .env, пока этот процесс работает. Ctrl+C — остановить.`
  );

  const shutdown = () => {
    console.log("\nОстанавливаю мосты…");
    for (const s of servers) s.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main();
