import { execFileSync } from "node:child_process";
import path from "node:path";

try {
  const root = execFileSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
  execFileSync("git", ["config", "core.hooksPath", path.join(root, ".githooks")], {
    stdio: "ignore",
  });
} catch {
  // ZIP exports and Docker builds may not contain Git metadata.
}

