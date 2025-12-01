import React from "react";
import { createRoot } from "react-dom/client";
import "toastify-js/src/toastify.css";
import "./index.css";
import { App } from "./App";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Create a client
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh
			gcTime: 10 * 60 * 1000, // 10 minutes - garbage collection time (renamed from cacheTime in v5)
			refetchOnWindowFocus: false, // Don't refetch on window focus
			retry: 1, // Retry failed requests once
		},
	},
});

const root = createRoot(document.getElementById("root"));

root.render(
	<React.StrictMode>
		<QueryClientProvider client={queryClient}>
			<App />
		</QueryClientProvider>
	</React.StrictMode>
);
