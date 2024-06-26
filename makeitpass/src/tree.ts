import fs from "node:fs/promises";
import path from "node:path";
import ignore from "ignore";
import pc from "picocolors";
import { ensurePathInCwd } from "./ensure-path-in-cwd";
import { log } from "./log";

interface TreeNode {
  name: string;
  type: "file" | "directory";
  children?: TreeNode[];
}

async function generateTree(opts: { path: string; iteration: number }): Promise<string> {
  console.log(
    pc.cyan(
      `${pc.yellow(`Iteration ${opts.iteration}`)}: 🤖 Generating tree for directory: ${opts.path}`,
    ),
  );
  const absolutePath = ensurePathInCwd(opts.path);
  const { execa } = await import("execa");

  // Check if tree command exists
  try {
    await execa("tree", ["--version"]);
  } catch (_error) {
    console.log(pc.red('The "tree" utility is not installed or not in the system PATH.'));
    console.log(pc.yellow("Falling back to manual tree generation."));
    return JSON.stringify(await manualTreeGeneration(absolutePath));
  }

  // read .gitignore if it exists
  let gitignoreRules = "";
  try {
    log("reading .gitignore rules", 3);
    gitignoreRules = await fs.readFile(path.join(process.cwd(), ".gitignore"), "utf-8");
  } catch (_error) {
    // if .gitignore doesn't exist, we'll use an empty ruleset
  }

  // Build the tree command arguments
  const args = ["-L", "3", "-I", "node_modules|.git|.venv|dist"];
  if (gitignoreRules) {
    args.push("--gitignore");
  }
  args.push(absolutePath);

  try {
    const { stdout } = await execa("tree", args);
    return stdout;
  } catch (error) {
    console.log(pc.red(`Error generating tree: ${(error as Error).message}`));
    console.log(pc.yellow("Falling back to manual tree generation."));
    return JSON.stringify(await manualTreeGeneration(absolutePath));
  }
}

async function manualTreeGeneration(absolutePath: string): Promise<TreeNode> {
  const ig = ignore().add(await readGitignore());
  ig.add(["node_modules", ".git", ".venv", "dist"]); // Add default ignores

  async function buildTree(dir: string): Promise<TreeNode> {
    log(`building tree for directory: ${dir}`, 3);
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const children: TreeNode[] = [];

    for (const entry of entries) {
      const relativePath = path.relative(process.cwd(), path.join(dir, entry.name));

      // skip if the file is ignored
      if (ig.ignores(relativePath)) continue;

      if (entry.isDirectory()) {
        children.push(await buildTree(path.join(dir, entry.name)));
      } else {
        children.push({ name: entry.name, type: "file" });
      }
    }

    return {
      name: path.basename(dir),
      type: "directory",
      children: children.length > 0 ? children : undefined,
    };
  }

  return await buildTree(absolutePath);
}

async function readGitignore(): Promise<string> {
  try {
    log("reading .gitignore rules", 3);
    return await fs.readFile(path.join(process.cwd(), ".gitignore"), "utf-8");
  } catch (_error) {
    return ""; // if .gitignore doesn't exist, we'll use an empty ruleset
  }
}

export { generateTree };
