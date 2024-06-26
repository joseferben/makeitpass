import type { ExecaError } from "execa";
import pc from "picocolors";
import { applyFix } from "./llm";
import { log } from "./log";
import { spinner } from "./spinner";

export async function fixCommand() {
  log("main loop start", 2);
  const command = process.argv.slice(2).join(" ");
  if (!command) {
    console.error("Please provide a command that should pass");
    process.exit(1);
  }
  console.log(pc.magenta(`Making ${pc.white(command)} pass 🦩`));
  const binary = command.split(" ")[0];
  const args = command.split(" ").slice(1);
  const { execa } = await import("execa");
  let result = await spinner(
    "Running command",
    execa(binary, args, {
      preferLocal: true,
      reject: false,
    }),
  );
  let iteration = 0;
  while (result?.exitCode !== 0) {
    const error = result.failed ? JSON.stringify(result as ExecaError) : result.stderr;
    const errorLines = result.failed
      ? (result as ExecaError).message.split("\n").slice(0, 5)
      : result.stderr.split("\n").slice(0, 5);
    const lastFiveLines = errorLines.slice(-5).join("\n");
    console.log(pc.red(lastFiveLines));
    console.log(`${pc.yellow(`Iteration ${iteration}:`)} Command failed, let's make it pass.`);
    await applyFix({ command, stdout: result.stdout, error, iteration });
    iteration++;
    console.log(
      `${pc.yellow(`Iteration ${iteration}:`)} Checking if ${pc.white(command)} passes...`,
    );
    result = await spinner(
      "Running command",
      execa(binary, args, { preferLocal: true, reject: false }),
    );
  }

  console.log(pc.white(result.stdout.split("\n").slice(0, 5).slice(-5).join("\n")));
  console.log(pc.green(`Command ${pc.white(command)} passed 🎉`));
  log("command succeeded!", 1);
}
