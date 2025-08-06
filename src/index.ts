import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Ejemplo: Endpoint base
app.get("/", (req, res) => {
  res.send("CrewAI Orchestrator Backend is running 🚀");
});

app.listen(port, () => {
  console.log(`Servidor Express corriendo en http://localhost:${port}`);
});
