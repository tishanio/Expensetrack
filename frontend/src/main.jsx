import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        containerStyle={{ top: 76 }}
        toastOptions={{
          duration: 2600,
          className: "toast-shell",
          success: {
            iconTheme: { primary: "#00c875", secondary: "#fff" },
          },
          error: {
            iconTheme: { primary: "#e01b3c", secondary: "#fff" },
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
