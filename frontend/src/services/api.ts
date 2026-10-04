import axios from "axios";
import { contaAtivaId, removerConta } from "./accountVault";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://helsis-backend.onrender.com/api" : "http://localhost:3333/api"),
});

// Anexa o token JWT salvo no login em toda requisição autenticada.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Se o token expirar/for inválido, remove só a conta expirada do cofre e cai na
// próxima conta salva (ou no /login se não sobrar nenhuma). Assim as outras
// sessões salvas continuam válidas — só a que deu 401 é descartada.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // O próprio login trata credenciais inválidas (erro inline). Sem esta guarda,
    // um 401 de senha errada dispararia o redirect/remoção abaixo e recarregaria
    // a página antes de mostrar a mensagem — parecendo que "não loga".
    const url = error.config?.url ?? "";
    const ehLogin = url.includes("/auth/login");

    if (error.response?.status === 401 && !ehLogin) {
      const ativa = contaAtivaId();
      if (ativa) {
        removerConta(ativa); // já troca pra próxima ou manda ao /login
      } else {
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
