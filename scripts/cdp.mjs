/**
 * CDP driver for the ExpenseSnap WebView.
 *
 * Usage: node scripts/cdp.mjs "<js expression>"
 * Forwards adb to the app's webview_devtools_remote socket, connects via
 * Chrome DevTools Protocol, evaluates the expression in the page context,
 * and prints the JSON-serialized result.
 */
import { execSync } from "node:child_process";

const ADB = `${process.env.LOCALAPPDATA}/Android/Sdk/platform-tools/adb.exe`;
const DEVICE = "emulator-5554";
const LOCAL_PORT = 9223;

function findWebviewSocket() {
  const out = execSync(`"${ADB}" -s ${DEVICE} shell "cat /proc/net/unix"`, {
    encoding: "utf8",
  });
  const sockets = [...out.matchAll(/@webview_devtools_remote_(\d+)/g)].map((m) => m[0]);
  if (sockets.length === 0) throw new Error("No webview devtools socket found");
  // If several webviews exist, pick the one whose target URL is our app.
  return sockets;
}

async function pickTarget(sockets) {
  for (const socket of sockets) {
    execSync(`"${ADB}" -s ${DEVICE} forward tcp:${LOCAL_PORT} localabstract:${socket.replace("@", "")}`);
    const res = await fetch(`http://localhost:${LOCAL_PORT}/json`);
    const targets = await res.json();
    const page = targets.find(
      (t) => t.type === "page" && /localhost|android_asset/.test(t.url)
    );
    if (page) return page;
  }
  throw new Error("No matching WebView page target");
}

const expr = process.argv[2];
if (!expr) {
  console.error("Usage: node scripts/cdp.mjs \"<js expression>\"");
  process.exit(1);
}

const sockets = findWebviewSocket();
const target = await pickTarget(sockets);
const ws = new WebSocket(target.webSocketDebuggerUrl);

const result = await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error("CDP timeout (60s)")), 60000);
  ws.onopen = () => {
    ws.send(
      JSON.stringify({
        id: 1,
        method: "Runtime.evaluate",
        params: {
          expression: expr,
          returnByValue: true,
          awaitPromise: true,
        },
      })
    );
  };
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id === 1) {
      clearTimeout(timeout);
      if (msg.result?.exceptionDetails) {
        reject(new Error(JSON.stringify(msg.result.exceptionDetails, null, 2)));
      } else {
        resolve(msg.result?.result?.value);
      }
      ws.close();
    }
  };
  ws.onerror = () => {
    clearTimeout(timeout);
    reject(new Error("WebSocket error"));
  };
});

console.log(typeof result === "string" ? result : JSON.stringify(result, null, 2));
