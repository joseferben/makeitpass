import path from "node:path";
import { log } from "./log";

export function ensurePathInCwd(filePath: string): string {
  log(`ensuring path is in current working directory: ${filePath}`, 3);
  const absolutePath = path.resolve(process.cwd(), filePath);
  if (!absolutePath.startsWith(process.cwd())) {
    throw new Error("access denied: file is outside the current working directory");
  }
  return absolutePath;
}
