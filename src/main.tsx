import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import SettingsApp from "./SettingsApp";
import { migrateDefaultCity } from "./lib";
import "./styles.css";

migrateDefaultCity();

const isSettings = new URLSearchParams(window.location.search).has("settings");
if (isSettings) document.body.classList.add("settings-mode");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {isSettings ? <SettingsApp /> : <App />}
  </React.StrictMode>
);
