#!/usr/bin/env node
import { fixCommand } from "./command";

fixCommand().catch((error) => {
  console.error("An error occurred:", error);
  process.exit(1);
});
