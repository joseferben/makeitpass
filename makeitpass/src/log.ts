import { verbose } from "./config";

export function log(message: string, level: number) {
  if (verbose >= level) {
    console.log(message);
  }
}
