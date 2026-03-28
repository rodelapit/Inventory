import { spawnSync, spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const PORT = 3001;
const LOCK_PATH = resolve(process.cwd(), ".next", "dev", "lock");

function getListeningPids(port) {
  const result = spawnSync("cmd.exe", ["/d", "/s", "/c", `netstat -ano | findstr :${port}`], {
    encoding: "utf8",
  });

  if (!result.stdout) return [];

  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.includes("LISTENING"))
    .map((line) => line.split(/\s+/).at(-1))
    .filter(Boolean)
    .map((pid) => Number(pid))
    .filter((pid) => Number.isInteger(pid) && pid > 0);
}

function killPid(pid) {
  const kill = spawnSync("taskkill", ["/PID", String(pid), "/F"], { encoding: "utf8" });
  return kill.status === 0;
}

function cleanupPortAndLock() {
  const pids = getListeningPids(PORT);
  if (pids.length > 0) {
    for (const pid of pids) {
      const ok = killPid(pid);
      if (ok) {
        console.log(`[dev-launcher] Freed port ${PORT} by stopping PID ${pid}.`);
      }
    }
  }

  if (existsSync(LOCK_PATH)) {
    rmSync(LOCK_PATH, { force: true });
    console.log("[dev-launcher] Removed stale .next/dev/lock.");
  }
}

function startNextDev() {
  const child = spawn("npx", ["next", "dev", "--webpack", "--port", String(PORT)], {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });
}

cleanupPortAndLock();
startNextDev();
