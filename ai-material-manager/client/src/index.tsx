import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";
import RoutesComponent from "./app";
import "./index.css";
import { createPortal } from "react-dom";
import { Toaster } from "@client/src/components/ui/sonner";
import { AuthProvider } from "@client/src/auth/auth-provider";
import { InboxProvider } from "@client/src/inbox/inbox-provider";
import { Button } from "@client/src/components/ui/button";
import { QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import {
  createPersistOptions,
  queryClient,
} from "@client/src/lib/query-client";

import { prefetchLibraryFromLocation } from "@client/src/pages/library/library-queries";

const persistOptions = createPersistOptions();

const DataProvider = ({ children }: { children: React.ReactNode }) =>
  persistOptions ? (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persistOptions}
    >
      {children}
    </PersistQueryClientProvider>
  ) : (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

const MainApp = () => {
  return (
    <DataProvider>
      <BrowserRouter future={{ v7_startTransition: true }}>
        <AuthProvider>
          <InboxProvider>
            <ErrorBoundary
              fallbackRender={({ error, resetErrorBoundary }) => (
                <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
                  <h1 className="text-lg font-semibold">页面加载失败</h1>
                  <p className="max-w-lg text-sm text-muted-foreground">
                    {error instanceof Error ? error.message : "请稍后重试"}
                  </p>
                  <Button onClick={resetErrorBoundary}>重新加载</Button>
                </div>
              )}
            >
              <RoutesComponent />
              {createPortal(<Toaster />, document.body)}
            </ErrorBoundary>
          </InboxProvider>
        </AuthProvider>
      </BrowserRouter>
    </DataProvider>
  );
};

createRoot(document.getElementById("root")!).render(<MainApp />);
prefetchLibraryFromLocation(window.location);
