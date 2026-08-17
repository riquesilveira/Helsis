import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { EtapasStatusProvider } from "./hooks/useEtapasStatus";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <EtapasStatusProvider>
        <App />
      </EtapasStatusProvider>
    </BrowserRouter>
  </React.StrictMode>
);
