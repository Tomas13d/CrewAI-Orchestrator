import { Router } from "express";
import { Workflow } from "../crew-definitions/Workflow";
import { Agent } from "../crew-definitions/Agent";
import { Task } from "../crew-definitions//Task";
import * as path from "path";
import fs from "fs";
import * as xmlToJson from "./xml-JSON.json";

const router = Router();

const blockLogicAnalyzerAgent = new Agent({
  role: "Oracle Forms Logic Analyzer",
  goal: `Analizarás un bloque específico de un formulario Oracle Forms (convertido a JSON) y encontrarás los triggers y program units relacionados.`,
  backstory: `Sos un experto en Oracle Forms y migraciones a arquitecturas modernas. Ayudás a descomponer formularios complejos en piezas reutilizables.`,
});

export const getBlockLogicFromOpenAI = async (
  blockName: string,
  input: any,
  accumulatedContext: string[] = []
) => {
  // Obtener el bloque específico
  const block = input?.Module?.FormModule?.Block?.find(
    (b: any) => b?.["-Name"] === blockName
  );

  if (!block) {
    throw new Error(`Bloque ${blockName} no encontrado.`);
  }

  // Armar tarea con prompt y contexto
  const logicTask = new Task({
    description: `Analizá el bloque "${blockName}" del formulario y devolvé los triggers y program units asociados.`,
    agent: blockLogicAnalyzerAgent,
    contextTasks: [],
    promptParts: [
      {
        role: "user",
        content: `
Tenés el siguiente bloque del formulario Oracle Forms (en formato JSON):

\`\`\`json
${JSON.stringify(block, null, 2)}
\`\`\`

Y este es el resto del formulario, donde están definidos los triggers y program units globales:

\`\`\`json
{
  "Trigger": ${JSON.stringify(
    input?.Module?.FormModule?.Trigger || [],
    null,
    2
  )},
  "ProgramUnit": ${JSON.stringify(
    input?.Module?.FormModule?.ProgramUnit || [],
    null,
    2
  )}
}
\`\`\`

Instrucciones:
- Identificá todos los triggers relacionados con el bloque "${blockName}".
- Identificá todas las program units llamadas o usadas por esos triggers.
- Armá una respuesta en formato JSON con: block, triggers, programUnits, summary y referencias cruzadas.

Contexto acumulado hasta ahora:
${accumulatedContext.join("\n\n")}

Respuesta esperada (en JSON):
{
  "block": "${blockName}",
  "triggers": [...],
  "programUnits": [...],
  "summary": "...",
  "references": [...]
}
        `.trim(),
      },
    ],
    expectedOutput: `Un JSON con triggers, program units y lógica del bloque.`,
  });

  // Ejecutar la tarea
  const workflow = new Workflow({
    agents: [blockLogicAnalyzerAgent],
    tasks: [logicTask],
  });
  const result = await workflow.initiate();

  try {
    const parsed = JSON.parse(result);
    return parsed;
  } catch (e) {
    console.error("Error al parsear respuesta de agente:", e);
    return {
      block: blockName,
      triggers: [],
      programUnits: [],
      summary: "",
      references: [],
    };
  }
};

router.post("/express", async (req, res) => {
  try {
    const input = xmlToJson;
    const outputDir = path.join(__dirname, "outputs_logic_with_openAI");

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    // Inicializar contexto acumulado
    let accumulatedContext: string[] = [];

    // Agentes configurados
    const translatorAgent = new Agent({
      role: "PL/SQL Translator",
      goal: `Recibirás fragmentos de lógica de un Oracle Form ya convertidos a JSON. Tu tarea es traducir esa lógica a funciones TypeScript compatibles con Express. Conserva nombres y reglas de negocio. Nunca omitas código.`,
      backstory: `Eres un ingeniero con experiencia migrando PL/SQL a TypeScript para Express.`,
    });

    const expressAgent = new Agent({
      role: "Express Code Generator",
      goal: `Genera código completo para un módulo Express usando TypeScript basado en lógica ya traducida. Incluye controlador, servicio y DTOs. No omitas nada.`,
      backstory: `Eres un arquitecto backend especializado en Express y migraciones de Oracle Forms.`,
    });

    /*     const getLogicForBlock = (blockName: string, input: any) => {
      const triggers =
        input?.Module?.FormModule?.Trigger?.filter((trigger: any) => {
          if (trigger.block === blockName) return true;
          if (trigger.TriggerText?.includes(`:${blockName}`)) return true;

          return false;
        }) || [];

      const programUnits =
        input?.Module?.FormModule?.ProgramUnit?.filter((programUnit: any) => {
          if (programUnit.block === blockName) return true;

          return triggers.some((trigger: any) =>
            trigger.TriggerText?.includes(programUnit.Name)
          );
        }) || [];

      return { triggers, programUnits };
    }; */

    const blocks = input["Module"]["FormModule"]["Block"] || [];
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const blockName = block["-Name"] || `Block${i}`;
      const blockLogic = getBlockLogicFromOpenAI(
        blockName,
        input,
        accumulatedContext
      );

      // Task 1: traducir PL/SQL a TypeScript
      const translatorTask = new Task({
        description: `Traducí a TypeScript la lógica del bloque Oracle Forms "${blockName}".`,
        agent: translatorAgent,
        promptParts: [{ role: "user", content: JSON.stringify(blockLogic) }],
        expectedOutput: `Funciones TypeScript traducidas.`,
      });

      // Task 2: generar módulo Express
      const expressTask = new Task({
        description: `Generá un módulo Express completo para el bloque "${blockName}" en base a la lógica traducida y el contexto acumulado.`,
        agent: expressAgent,
        contextTasks: [translatorTask],
        promptParts: [
          {
            role: "user",
            content: `Este es el contexto acumulado: ${accumulatedContext.join(
              "\n\n"
            )}`,
          },
        ],
        expectedOutput: `Código completo del módulo Express.`,
      });

      const workflow = new Workflow({
        agents: [translatorAgent, expressAgent],
        tasks: [translatorTask, expressTask],
      });

      const result = await workflow.initiate();
      accumulatedContext.push(result);

      fs.writeFileSync(path.join(outputDir, `module_${blockName}.ts`), result);

      console.log(`✅ Bloque procesado: ${blockName}`);
    }

    console.log("🏁 Todos los bloques fueron procesados.");
    res
      .status(200)
      .send({ message: "Todos los bloques procesados correctamente." });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error al procesar la solicitud: ${msg}`);
    res.status(500).send({ message: msg });
  }
});

export default router;
