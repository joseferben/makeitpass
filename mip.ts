#!/usr/bin/env node
import { exec, ExecException } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import Anthropic from "@anthropic-ai/sdk";

const execAsync = promisify(exec);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const tools: Anthropic.Tool[] = [
  {
    name: "read_file",
    description: "Read the contents of a file",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "The path of the file to read" },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Write content to a file",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "The path of the file to write" },
        content: {
          type: "string",
          description: "The content to write to the file",
        },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "list_files",
    description: "List files in a directory",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "The path of the directory to list",
        },
      },
      required: ["path"],
    },
  },
];

async function runCommand(
  command: string
): Promise<{ code: number; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execAsync(command);
    return { code: 0, stdout, stderr };
  } catch (error) {
    const commandError = error as {
      code: number | null;
      stdout: string;
      stderr: string;
    };
    if (commandError.code !== undefined) {
      return {
        code: commandError.code !== null ? commandError.code : 1,
        stdout: commandError.stdout || "",
        stderr: commandError.stderr || "",
      };
    }
    throw error;
  }
}

async function readFile(filePath: string): Promise<string> {
  return await fs.readFile(filePath, "utf-8");
}

async function writeFile(filePath: string, content: string): Promise<void> {
  await fs.writeFile(filePath, content, "utf-8");
}

async function listFiles(dirPath: string): Promise<string[]> {
  const files = await fs.readdir(dirPath);
  return files.map((file) => path.join(dirPath, file));
}

async function executeTool(toolName: string, toolInput: any): Promise<string> {
  switch (toolName) {
    case "read_file":
      return await readFile(toolInput.path);
    case "write_file":
      await writeFile(toolInput.path, toolInput.content);
      return `File written successfully: ${toolInput.path}`;
    case "list_files":
      const files = await listFiles(toolInput.path);
      return files.join("\n");
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

async function askClaude(prompt: string): Promise<string> {
  const userMessage: Anthropic.MessageParam = {
    role: "user",
    content: prompt,
  };

  const message = await anthropic.messages.create({
    model: "claude-3-sonnet-20240229",
    max_tokens: 1000,
    messages: [userMessage],
    tools,
  });

  let response = "";
  for (const content of message.content) {
    if (content.type === "text") {
      response += content.text;
    } else if (content.type === "tool_use") {
      const toolResult = await executeTool(content.name, content.input);
      const toolResultMessage: Anthropic.MessageParam = {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: content.id,
            content: [{ type: "text", text: toolResult }],
          },
        ],
      };

      const resultMessage = await anthropic.messages.create({
        model: "claude-3-sonnet-20240229",
        max_tokens: 1000,
        messages: [
          userMessage,
          { role: message.role, content: message.content },
          toolResultMessage,
        ],
        tools,
      });

      for (const resultContent of resultMessage.content) {
        if (resultContent.type === "text") {
          response += resultContent.text;
        }
      }
    }
  }

  return response;
}

async function fixCode(
  command: string,
  stdout: string,
  stderr: string
): Promise<void> {
  const prompt = `
The following command failed:
${command}

Stdout:
${stdout}

Stderr:
${stderr}

Please analyze the error and suggest changes to fix the issue. You can use the following tools to navigate and edit the codebase:
- read_file: Read the contents of a file
- write_file: Write content to a file
- list_files: List files in a directory

Provide your analysis and steps to fix the issue. Use the tools as needed to make the necessary changes.
`;

  const response = await askClaude(prompt);
  console.log("Claude's response:", response);
}

async function main() {
  const command = process.argv[2];
  if (!command) {
    console.error("Please provide a command to execute.");
    process.exit(1);
  }

  let result;
  do {
    console.log(`Running command: ${command}`);
    result = await runCommand(command);
    console.log(`Command exited with code ${result.code}`);

    if (result.code !== 0) {
      console.log("Command failed. Asking Claude for suggestions...");
      await fixCode(command, result.stdout, result.stderr);
    }
  } while (result.code !== 0);

  console.log("Command succeeded!");
}

main().catch((error) => {
  console.error("An error occurred:", error);
  process.exit(1);
});
