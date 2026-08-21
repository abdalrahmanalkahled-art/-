import { spawn } from "node:child_process";

const port = process.env.EXPO_PORT || "8081";
let activeChild;
let stopping = false;

function startMetro() {
  const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  activeChild = spawn(command, ["exec", "expo", "start", "--web", "--port", port], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });

  activeChild.once("exit", (code, signal) => {
    if (stopping) process.exit(code ?? 0);

    console.warn(`[metro-watch] Metro exited (${signal ?? `code ${code ?? 0}`}); restarting in 1.5s.`);
    setTimeout(startMetro, 1500);
  });
}

function stopMetro(signal) {
  stopping = true;
  activeChild?.kill(signal);
}

process.once("SIGINT", () => stopMetro("SIGINT"));
process.once("SIGTERM", () => stopMetro("SIGTERM"));

startMetro();
