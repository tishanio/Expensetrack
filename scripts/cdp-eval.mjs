/**
 * CDP file-eval driver for the ExpenseSnap WebView.
 *
 * Usage: node scripts/cdp-eval.mjs scripts/<file>.js
 *
 * Reads the JS file, substitutes __B64_PLACEHOLDER__ with the base64 of
 * e2e/receipt_test.jpg (if present), evaluates the script in the page
 * context, and prints the JSON-serialized completion value.
 */
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

const ADB = `${process.env.LOCALAPPDATA}/Android/Sdk/platform-tools/adb.exe`;
const DEVICE = "emulator-5554";
const LOCAL_PORT = 9223;

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/cdp-eval.mjs <script.js>");
  process.exit(1);
}

let expr = readFileSync(file, "utf8");

// Inline the test receipt so in-page code can build a real File object.
const b64Path = "e2e/receipt_test.jpg";
if (expr.includes("__B64_PLACEHOLDER__")) {
  if (!existsSync(b64Path)) throw new Error(`${b64Path} not found`);
  expr = expr.replace("__B64_PLACEHOLDER__", readFileSync(b64Path).toString("base64"));
}

// Forward to the app's webview devtools socket.
const out = execSync(`"${ADB}" -s ${DEVICE} shell "cat /proc/net/unix"`, { encoding: "utf8" });
const sockets = [...out.matchAll(/@webview_devtools_remote_(\d+)/g)].map((m) => m[0]);
if (sockets.length === 0) throw new Error("No webview devtools socket found");

let wsUrl = null;
for (const socket of sockets) {
  execSync(`"${ADB}" -s ${DEVICE} forward tcp:${LOCAL_PORT} localabstract:${socket.replace("@", "")}`);
  const res = await fetch(`http://localhost:${LOCAL_PORT}/json`);
  const targets = await res.json();
  const page = targets.find((t) => t.type === "page" && /localhost|android_asset/.test(t.url));
  if (page) {
    wsUrl = page.webSocketDebuggerUrl;
    break;
  }
}
if (!wsUrl) throw new Error("No matching WebView page target");

const ws = new WebSocket(wsUrl);
const result = await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error("CDP timeout (120s)")), 120000);
  ws.onopen = () => {
    ws.send(
      JSON.stringify({
        id: 1,
        method: "Runtime.evaluate",
        params: { expression: expr, returnByValue: true, awaitPromise: true },
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
