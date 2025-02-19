# makeitpass

`npx makeitpass "tsc --noEmit"`

![demo](test/demo.gif)

`makeitpass` runs the provided CLI command and iterates on the files using Claude until the command passes.

It's a little CLI helper that fixes tests and builds for you!

Example commands:

- `npx makeitpass "tsc --noEmit"`
- `npx makeitpass "pytest"`
- `npx makeitpass "npm run build"`
- `npx makeitpass "make"`

## Getting Started

`ANTHROPIC_API_KEY=<your-api-key> npx makeitpass "<your-command>"`

You need Node.js/npm and a [claude.ai](https://console.anthropic.com/dashboard) API key.

makeitpass makes changes to files in the current working directory. Make sure to commit or stash changes beforehand, or you might lose them!

You can also add the API key to your `.env` file and run `npx makeitpass "<your-command>"`.

## Configuration

- `VERBOSE`: 0 for no verbose logging, 3 for max verbosity (default: 0)
- `MODEL`: the claude.ai model to use (default: claude-3-5-sonnet-20240620)
- `MAX_TOKENS`: the maximum number of tokens to use (default: 4096, this is max for claude-3-5-sonnet-20240620)
- `PROMPT`: the prompt to use (default: see below)
- `ANTHROPIC_API_KEY`: the Anthropic API key (default: none)

### Default Prompt

The prompt is a multi-turn conversation between the LLM and the user.

```
Your job is to analyze the error and the code base and to apply fixes so that the command passes.

Available tools:
- readFile: Read the contents of a file in the current working directory
- writeFile: Write content to a file in the current working directory
- listFiles: List files in the current working directory
- tree: Display the directory structure as a tree, ignoring files matching .gitignore

Keep using tree, listFiles and readFile until you have a good understanding of the codebase and the error.
Once you are confident, use the writeFile tool to apply fixes.

I will run the command again and give you feedback.
This whole process is repeated until the command succeeds.
```

## About

Large language models produce a lot of garbage, some of it is useful. By adding a second component to the LLM that verifies its output, we get a solid feedback loop. Test suites or build processes work well because they return a non-zero exit code when they fail.

makeitpass is generic enough to run any command. As long as the command exits with a non-zero exit code and prints useful information to stdout and stderr, it will try to fix it.
