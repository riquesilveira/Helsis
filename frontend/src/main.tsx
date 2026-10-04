import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { EtapasStatusProvider } from "./hooks/useEtapasStatus";
import { migrarSessaoAtiva } from "./services/accountVault";
import "./index.css";

// Garante que uma sessão logada ANTES do trocador de contas existir entre no
// cofre já no boot — assim ela aparece na lista e não some ao adicionar outra.
migrarSessaoAtiva();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <EtapasStatusProvider>
        <App />
      </EtapasStatusProvider>
    </BrowserRouter>
  </React.StrictMode>
);
