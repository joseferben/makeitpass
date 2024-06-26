import dotenv from "dotenv";
dotenv.config();

export const verbose = process.env.VERBOSE ? Number.parseInt(process.env.VERBOSE) : 0;
export const model = process.env.MODEL || "claude-3-5-sonnet-20240620";
export const maxTokens = process.env.MAX_TOKENS ? Number.parseInt(process.env.MAX_TOKENS) : 4096;
export const prompt =
  process.env.PROMPT ||
  `Your job is to analyze the error and the code base and to apply fixes so that the command passes.

Available tools:
- readFile: Read the contents of a file in the current working directory
- writeFile: Write content to a file in the current working directory
- listFiles: List files in the current working directory
- tree: Display the directory structure as a tree, ignoring files matching .gitignore

Keep using tree, listFiles and readFile until you have a good understanding of the codebase and the error. 
Once you are confident, use the writeFile tool to apply fixes. 

Use multiple tools at once if possible. For instance, to apply fixes to multiple files you can call writeFile multiple times at once.

I will run the command again and give you feedback.
This whole process is repeated until the command succeeds.
`;
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY not set!");
  process.exit(1);
}
export const apiKey = process.env.ANTHROPIC_API_KEY;
