import "dotenv/config";
import { app } from "./app";

const PORT = process.env.PORT || 3333;

// Valida variáveis críticas antes de subir o servidor
const JWT_SECRET = process.env.JWT_SECRET;
const PLACEHOLDERS = ["seu_segredo_aqui", "secret", "change_me", "changeme", "your_secret", ""];
if (!JWT_SECRET || PLACEHOLDERS.includes(JWT_SECRET.toLowerCase())) {
  console.error("[FATAL] JWT_SECRET não está definido ou é um valor placeholder inseguro. Configure a variável de ambiente e reinicie.");
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
});
