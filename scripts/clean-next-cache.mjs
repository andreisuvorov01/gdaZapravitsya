// Удаляет .next — лечит «Internal Server Error» после параллельного build + dev.
import { existsSync, rmSync } from "node:fs";

if (existsSync(".next")) {
  rmSync(".next", { recursive: true, force: true });
  console.log("Кэш .next удалён");
}
