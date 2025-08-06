import {
  ResponseFormatJSONObject,
  ResponseFormatJSONSchema,
  ResponseFormatText,
} from "openai/resources";
import isTypedError from "../utils/isTypeError";
import OpIA from "../openAIConfig";
import formatTemplate from "../utils/formatTemplate";
import { Task } from "./Task";
import * as templates from "./templates.json";

const languageCodeToName = {
  es: "spanish",
  en: "english",
} as const;

type LanguageCode = keyof typeof languageCodeToName;

type ResponseFormat =
  | ResponseFormatText
  | ResponseFormatJSONObject
  | ResponseFormatJSONSchema;

interface AgentAttributes {
  role: string;
  goal: string;
  backstory?: string;
  language?: LanguageCode;
  format?: ResponseFormat;
}

export class Agent implements AgentAttributes {
  role: string;
  goal: string;
  backstory: string;
  /**
   *  Language code for the agent to use
   *
   *  @default "es"
   */
  language: LanguageCode;
  format: ResponseFormat;

  constructor(agentAttributes: AgentAttributes) {
    if (!agentAttributes.role || !agentAttributes.goal) {
      throw new Error(
        "Both 'role' and 'goal' are required to create an Agent."
      );
    }

    this.role = agentAttributes.role;
    this.goal = agentAttributes.goal;
    this.backstory = agentAttributes.backstory || "";
    this.language = agentAttributes.language || "es";
    this.format = agentAttributes.format || { type: "text" };

    if (!languageCodeToName[this.language]) {
      throw new Error(`Invalid language code: ${this.language}`);
    }
  }

  async executeTask({ task, context }: { task: Task; context?: string }) {
    try {
      const taskPrompt = this.getTaskPrompt({ task, context });
      console.debug("Task prompt generated:", { taskPrompt });

      const completion = await OpIA.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: taskPrompt },
          ...task._promptParts,
        ],
        temperature: task.generationConfig?.temperature || 0.7,
        max_tokens: task.generationConfig?.max_tokens,
        response_format: this.format,
      });

      const responseMessage = completion.choices[0]?.message?.content || "";
      if (!responseMessage) {
        throw new Error("Received an empty response from OpenAI");
      }

      return { response: responseMessage };
    } catch (error) {
      console.error("Error executing task", { error, task });

      throw new Error(
        `Failed to execute task: ${isTypedError(error) ? error.message : "ss"}`
      );
    }
  }

  private getTaskPrompt({ task, context }: { task: Task; context?: string }) {
    const agentPersonality = this.getAgentPersonality();
    const taskContext = context
      ? this.getTaskPromptWithContext(task, context)
      : task.prompt();
    const languagePrompt = this.getLanguagePrompt();

    return `${agentPersonality}\n${taskContext}\n${languagePrompt}`;
  }

  private getTaskPromptWithContext(task: Task, context: string) {
    return formatTemplate(templates["promptParts"]["taskWithContext"], {
      task: task.prompt(),
      context,
    });
  }

  private getAgentPersonality() {
    return formatTemplate(templates["promptParts"]["personality"], {
      role: this.role,
      goal: this.goal,
      backstory: this.backstory,
    });
  }

  private getLanguagePrompt() {
    return formatTemplate(templates["promptParts"]["language"], {
      language: languageCodeToName[this.language],
    });
  }

  agentExecutor() {
    // Placeholder for potential future implementation
  }
}
