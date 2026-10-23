import { lazy, Suspense } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { AppShell } from "@/layout/AppShell";
import { Button } from "@/components/ui/button";
import { HomePage } from "./pages/HomePage";
import { InterviewPage } from "./pages/InterviewPage";

/** Dev-only design preview with fixture data (stripped from production builds). */
const PreviewPage = import.meta.env.DEV ? lazy(() => import("./dev/PreviewPage")) : null;

function NotFound() {
  return (
    <main id="main" className="page-container flex flex-col items-start gap-3 py-16">
      <p className="font-mono text-[13px] text-muted-foreground tabular-nums">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-muted-foreground">This address doesn't match an interview or a page.</p>
      <Button asChild variant="outline" className="mt-2">
        <Link to="/">Back to start</Link>
      </Button>
    </main>
  );
}

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/interview/:id" element={<InterviewPage />} />
        {PreviewPage && (
          <Route
            path="/__preview"
            element={
              <Suspense fallback={null}>
                <PreviewPage />
              </Suspense>
            }
          />
        )}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppShell>
  );
}
