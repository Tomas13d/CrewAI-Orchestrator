import formatTemplate from "../utils/formatTemplate";
import { Agent } from "./Agent";
import * as templates from "./templates.json";
import isTypedError from "../utils/isTypeError";
import { ChatCompletionMessageParam } from "openai/resources";

interface TaskAttributes {
  description: string;
  agent: Agent;
  expectedOutput: string;
  contextTasks?: Task[];
  promptParts?: ChatCompletionMessageParam[];
  generationConfig?: {
    temperature?: number;
    max_tokens?: number;
  };
  onComplete?: (output: string, task: Task) => Promise<void> | void; // <-- nueva línea
}

export class Task implements TaskAttributes {
  description: string;
  agent: Agent;
  expectedOutput: string;
  contextTasks?: Task[];
  output?: string;
  private _promptContext: string;
  public _promptParts: ChatCompletionMessageParam[];
  generationConfig?: {
    temperature?: number;
    max_tokens?: number;
  };
  onComplete?: (output: string, task: Task) => Promise<void> | void;

  constructor(taskAttributes: TaskAttributes) {
    if (
      !taskAttributes.description ||
      !taskAttributes.agent ||
      !taskAttributes.expectedOutput
    ) {
      throw new Error(
        "Task requires 'description', 'agent', and 'expectedOutput' to be defined."
      );
    }

    this.description = taskAttributes.description;
    this.agent = taskAttributes.agent;
    this.expectedOutput = taskAttributes.expectedOutput;
    this.contextTasks = taskAttributes.contextTasks || [];
    this._promptContext = "";
    this._promptParts = taskAttributes.promptParts || [];
    this.generationConfig = taskAttributes.generationConfig;
    this.onComplete = taskAttributes.onComplete;
  }

  async execute() {
    try {
      if (this.contextTasks && this.contextTasks.length > 0) {
        // Combine context from all related tasks
        this._promptContext = this.contextTasks
          .map((task) => task.output || "")
          .filter(Boolean) // Exclude undefined or empty outputs
          .join("\n");
      }

      return await this._executeTask({
        agent: this.agent,
        context: this._promptContext,
        task: this,
      });
    } catch (error) {
      console.error("Error executing task:", { error, task: this });
      throw new Error(
        `Failed to execute task '${this.description}': ${
          isTypedError(error) ? error.message : "ss"
        }`
      );
    }
  }

  private async _executeTask({
    agent,
    context,
    task,
  }: {
    task: Task;
    agent: Agent;
    context: string;
  }) {
    try {
      const result = await agent.executeTask({
        task,
        context,
      });

      // Store the response output
      this.output = result.response;

      if (this.onComplete) {
        await this.onComplete(this.output, this);
      }

      return result;
    } catch (error) {
      console.error("Error during task execution", { error, task });
      throw error;
    }
  }

  prompt() {
    // Generate the complete prompt for this task
    const expectedOutputPart = this.getExpectedOutputPromptPart();
    const promptParts = [this.description, expectedOutputPart];

    return promptParts.join("\n");
  }

  private getExpectedOutputPromptPart() {
    // Generate the prompt part for the expected output
    try {
      return formatTemplate(templates["promptParts"]["expectedOutput"], {
        expectedOutput: this.expectedOutput,
      });
    } catch (error) {
      console.error("Error formatting expected output prompt", {
        error,
        expectedOutput: this.expectedOutput,
      });
      throw new Error("Failed to format the expected output prompt.");
    }
  }
}
