import { Agent } from "./Agent";
import { Task } from "./Task";

interface WorkflowAttributes {
  tasks: Task[];
  agents: Agent[];
}

export class Workflow {
  tasks: Task[];
  agents: Agent[];
  finalOutputTask: Task;

  constructor(workflowAttributes: WorkflowAttributes) {
    this.tasks = workflowAttributes.tasks;
    this.agents = workflowAttributes.agents;
    this.finalOutputTask = this.tasks[this.tasks.length - 1];
  }

  async initiate() {
    let taskIndex = 0;
    let outputContent = "";
    let results = new Map();

    for (const task of this.tasks) {
      console.debug(`Executing task ${taskIndex + 1}/${this.tasks.length}`); // Debugging log
      results.set(taskIndex, {
        taskId: taskIndex,
        startedTime: Date.now(),
      });

      console.debug(`Working agent: ${task.agent.role}`);
      console.debug(`Starting task: ${task.description}`);

      let output = await task.execute();

      results.set(taskIndex, {
        ...results.get(taskIndex),
        output: output,
        completedTime: Date.now(),
      });

      console.debug(
        `Task completed took ${
          results.get(taskIndex).completedTime -
          results.get(taskIndex).startedTime
        }ms`,
        output.response
      );

      if (taskIndex === this.tasks.length - 1) {
        console.debug("Workflow completed");
        console.debug(`Final output: ${output.response}`);
        outputContent = output.response;
      }
      taskIndex++;
    }

    return outputContent;
  }
}
