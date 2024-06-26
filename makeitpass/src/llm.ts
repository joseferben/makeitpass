import assert from "node:assert";
import Anthropic from "@anthropic-ai/sdk";
import pc from "picocolors";
import { apiKey, maxTokens, model, prompt } from "./config";
import { log } from "./log";
import { spinner } from "./spinner";
import { executeTool, tools } from "./tools";

const client = new Anthropic({
  apiKey,
});

function composePrompt(opts: { command: string; stdout: string; error: string }): string {
  return `
The following command failed:
${opts.command}
  
stdout:
${opts.stdout}
  
stderr:
${opts.error}

${prompt}`;
}

const messageHistory: Anthropic.MessageParam[] = [];

export async function applyFix(opts: {
  command: string;
  stdout: string;
  error: string;
  iteration: number;
}): Promise<Anthropic.Messages.Message> {
  try {
    const prompt = composePrompt(opts);
    messageHistory.push({
      role: "user",
      content: prompt,
    });

    while (true) {
      log("asking claude...", 2);
      let response = await spinner(
        "Claude is thinking",
        client.messages.create({
          model,
          max_tokens: maxTokens,
          messages: messageHistory,
          tools,
        }),
      );
      messageHistory.push({ role: "assistant", content: response.content });
      assert(response.stop_reason === "tool_use", "expected tool_use response");

      const textMessage = response.content.find(
        (content): content is Anthropic.TextBlock => content.type === "text",
      );
      if (textMessage) {
        console.log(pc.cyan(`${pc.yellow(`Iteration ${opts.iteration}`)}: 🤖 ${textMessage.text}`));
      }
      const toolBlocks = response.content.filter(
        (content): content is Anthropic.ToolUseBlock => content.type === "tool_use",
      );
      assert(toolBlocks.length > 0, `no tool found in response: ${JSON.stringify(response)}`);

      // run tools in parallel
      const content = await spinner(
        "Running tools",
        Promise.all(
          toolBlocks.map(async (toolBlock) => {
            log(`claude is using tool: ${toolBlock.name}`, 2);
            const toolResult = await executeTool({
              name: toolBlock.name,
              input: toolBlock.input,
              iteration: opts.iteration,
            });
            assert(typeof toolResult === "string", `tool result should be string: ${toolResult}`);
            log(`tool result: ${toolResult}`, 2);
            return {
              type: "tool_result",
              tool_use_id: toolBlock.id,
              content: [{ type: "text", text: toolResult }],
            } satisfies Anthropic.ToolResultBlockParam;
          }),
        ),
      );
      messageHistory.push({ role: "user", content: content });

      response = await spinner(
        "Claude is thinking",
        client.messages.create({
          model,
          max_tokens: maxTokens,
          messages: messageHistory,
          tools,
        }),
      );

      // keep looping until decides not to use tools anymore
      if (response.stop_reason === "tool_use") continue;
      return response;
    }
  } catch (error) {
    console.dir(messageHistory, { depth: null });
    throw error;
  }
}
