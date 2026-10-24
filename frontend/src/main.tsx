import "./index.css";
import "./styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MotionConfig } from "motion/react";
import { IconContext } from "@phosphor-icons/react";
import { baseTransition } from "@/components/motion";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme";
import { App } from "./App";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
  <StrictMode>
    <ThemeProvider>
    <IconContext.Provider value={{ weight: "bold" }}>
    <MotionConfig reducedMotion="user" transition={baseTransition}>
      <TooltipProvider delayDuration={300}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
        <Toaster />
      </TooltipProvider>
    </MotionConfig>
    </IconContext.Provider>
    </ThemeProvider>
  </StrictMode>,
);
