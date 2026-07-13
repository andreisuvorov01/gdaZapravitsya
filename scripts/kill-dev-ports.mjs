// Освобождает порты dev-серверов Next.js (Windows).
import { execSync } from "node:child_process";

const ports = [3000, 3002, 3008, 3009, 3010];

for (const port of ports) {
  try {
    const out = execSync(
      `powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue).OwningProcess"`,
      { encoding: "utf8" }
    ).trim();
    if (!out) continue;
    const pids = [...new Set(out.split(/\s+/).filter(Boolean))];
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
        console.log(`Освобождён порт ${port} (PID ${pid})`);
      } catch {
        /* уже завершён */
      }
    }
  } catch {
    /* порт свободен */
  }
}
