🧠 Documentación de Entidades – Orquestador CrewAI
Esta documentación describe las clases principales del sistema de orquestación de agentes de IA basado en la librería CrewAI, adaptado para transformar JSONs derivados de Oracle Forms en aplicaciones Express/NestJS.

📦 Agent – Representa un agente de IA con personalidad, rol y objetivo
📄 Descripción
Encapsula la lógica para definir un agente con rol, objetivo, idioma, historia de fondo y formato de respuesta esperado. Utiliza plantillas para generar prompts personalizados para cada tarea.
🧩 Propiedades
role: string → Rol del agente (ej: "Backend Developer").


goal: string → Objetivo principal del agente.


backstory?: string → Historia de fondo del agente (opcional).


language: LanguageCode → Idioma de las respuestas (es o en, por defecto "es").


format: ResponseFormat → Formato de respuesta de OpenAI (text, json_object, etc).


⚙️ Métodos clave
executeTask({ task, context }): Ejecuta una tarea dada, combinando su descripción con el contexto acumulado.


getTaskPrompt(): Genera el prompt final a enviar a OpenAI, combinando personalidad, idioma, contexto y descripción de la tarea.


🛠️ Ejemplo (Express + Node.js): 



📦 Task – Unidad de trabajo a ser ejecutada por un agente
📄 Descripción
Una tarea representa una acción concreta que debe ejecutar un agente. Puede estar encadenada a otras tareas para pasar contexto entre pasos.
🧩 Propiedades
description: string → Descripción de la tarea (lo que debe hacer).


expectedOutput: string → Reglas o formato esperado de la respuesta.


agent: Agent → Agente responsable de ejecutarla.


contextTasks?: Task[] → Tareas previas cuyo output será usado como contexto.


promptParts?: ChatCompletionMessageParam[] → Mensajes adicionales para enriquecer el prompt.


generationConfig?: { temperature?, max_tokens? } → Configuración del modelo.


onComplete?: (output, task) => void → Callback post ejecución (opcional).


⚙️ Métodos clave
execute(): Ejecuta la tarea, recolectando contexto de tareas anteriores.


prompt(): Construye el prompt que será enviado al agente.


getExpectedOutputPromptPart(): Usa plantillas para incluir el formato esperado en el prompt.



📦 Workflow – Secuencia de tareas orquestadas entre múltiples agentes
📄 Descripción
Encapsula la ejecución encadenada de tareas. Ejecuta cada tarea en orden, pasando el resultado de unas como contexto para otras. El output final corresponde al de la última tarea.
🧩 Propiedades
tasks: Task[] → Lista de tareas a ejecutar.


agents: Agent[] → Lista de agentes participantes.


finalOutputTask: Task → Última tarea del flujo, usada para devolver el resultado principal.


⚙️ Métodos clave
initiate(): Ejecuta todo el workflow paso a paso. Acumula resultados parciales y devuelve el resultado final.



📦 templates.json – Plantillas dinámicas para prompts
Este archivo contiene estructuras parametrizadas para construir los prompts que se entregan al modelo. Permite adaptar fácilmente la lógica sin hardcodear strings en las clases.
json
{
  "promptParts": {
    "expectedOutput": "Your final response must follow the following guidelines: {expectedOutput}. Please ensure your answer includes the full content without summarizing.",
    "taskWithContext": "{task}\n\nThis is the context you're working with:\n{context}",
    "personality": "You are a {role}. {backstory}.\nYour goal is: {goal}.",
    "language": "Ensure all your responses are provided in {language} language."
  }
}


🧠 Flujo resumido de ejecución
Se definen uno o más agentes con distintas personalidades y objetivos.


Se crean tareas que indican qué debe hacer cada agente, incluyendo el formato deseado del resultado.


Las tareas pueden estar encadenadas para mantener un contexto acumulado.


Se ejecuta un Workflow que resuelve las tareas en orden y devuelve el resultado de la última.

