import fs from "node:fs/promises";
import path from "node:path";
import type Anthropic from "@anthropic-ai/sdk";
import pc from "picocolors";
import { z } from "zod";
import { ensurePathInCwd } from "./ensure-path-in-cwd";
import { log } from "./log";
import { generateTree } from "./tree";

async function readFile(opts: { path: string; iteration: number }): Promise<string> {
  console.log(
    pc.cyan(`${pc.yellow(`Iteration ${opts.iteration}`)}: 🤖 Reading file: ${opts.path}`),
  );
  const absolutePath = ensurePathInCwd(opts.path);
  return await fs.readFile(absolutePath, "utf-8");
}

async function writeFile(opts: {
  path: string;
  content: string;
  iteration: number;
}): Promise<void> {
  console.log(
    pc.cyan(`${pc.yellow(`Iteration ${opts.iteration}`)}: 🤖 Writing to file: ${opts.path}`),
  );
  const absolutePath = ensurePathInCwd(opts.path);
  await fs.writeFile(absolutePath, opts.content, "utf-8");
}

async function listFiles(opts: { path: string; iteration: number }): Promise<string[]> {
  console.log(
    pc.cyan(
      `${pc.yellow(`Iteration ${opts.iteration}`)}: 🤖 Listing files in directory: ${opts.path}`,
    ),
  );
  const absolutePath = ensurePathInCwd(opts.path);
  const files = await fs.readdir(absolutePath);
  return files.map((file) => path.relative(process.cwd(), path.join(absolutePath, file)));
}

export async function executeTool(opts: {
  name: string;
  input: unknown;
  iteration: number;
}): Promise<string> {
  const { name, input, iteration } = opts;
  log(`executing tool: ${name}`, 2);
  if (name === "readFile") {
    const parsed = z
      .object({
        path: z.string(),
      })
      .parse(input);
    return await readFile({ ...parsed, iteration });
  }
  if (name === "writeFile") {
    const parsed = z
      .object({
        path: z.string(),
        content: z.string(),
      })
      .parse(input);
    await writeFile({ ...parsed, iteration });
    log(`file written successfully: ${parsed.path}`, 1);
    return `file written successfully: ${parsed.path}`;
  }
  if (name === "listFiles") {
    const parsed = z
      .object({
        path: z.string(),
      })
      .parse(input);
    const files = await listFiles({ ...parsed, iteration });
    return files.join("\n");
  }
  if (name === "tree") {
    const parsed = z
      .object({
        path: z.string(),
      })
      .parse(input);
    return await generateTree({ ...parsed, iteration });
  }
  throw new Error(`unknown tool: ${name}`);
}

export const tools: Anthropic.Tool[] = [
  {
    name: "readFile",
    description: "read the contents of a file in the current working directory",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "the path of the file to read relative to the current working directory",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "writeFile",
    description: "write content to a file in the current working directory",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "the path of the file to write relative to the current working directory",
        },
        content: {
          type: "string",
          description: "the content to write to the file",
        },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "listFiles",
    description: "list files in the current working directory",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            "the path of the directory to list relative to the current working directory",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "tree",
    description: "display the directory structure as a tree, respecting .gitignore",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            "the root path to start the tree from, relative to the current working directory",
        },
      },
      required: ["path"],
    },
  },
];
