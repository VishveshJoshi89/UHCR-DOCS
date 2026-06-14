import { createHashRouter, RouterProvider } from "react-router-dom"; // 1. Changed import
import { Home } from "./pages/Home";
import { DocPage } from "./pages/DocPage";
import { NotFound } from "./pages/NotFound";
import { PluginBuilder } from "./pages/PluginBuilder";
import { DocsLayout } from "./layouts/DocsLayout";
import { Header } from "./components/Header";

function RootLayout() {
  return (
    <>
      {" "}
      <Header /> <DocsLayout />
    </>
  );
}

function HomeLayout() {
  return (
    <>
      {" "}
      <Header /> <Home />
    </>
  );
}

function PluginBuilderLayout() {
  return (
    <>
      {" "}
      <Header /> <PluginBuilder />
    </>
  );
}

// 2. Changed from createBrowserRouter to createHashRouter
const router = createHashRouter(
  [
    {
      path: "/",
      element: <HomeLayout />,
    },
    {
      path: "/plugin-builder",
      element: <PluginBuilderLayout />,
    },
    {
      path: "/docs",
      element: <RootLayout />,
      children: [
        { path: "introduction", element: <DocPage /> },
        { path: "installation", element: <DocPage /> },
        { path: "quickstart", element: <DocPage /> },
        { path: "jit-guide", element: <DocPage /> },
        { path: "plugin-guide", element: <DocPage /> },
        { path: "architecture", element: <DocPage /> },
        { path: "api-reference", element: <DocPage /> },
        { path: "hardware-reference", element: <DocPage /> },
        { path: "features", element: <DocPage /> },
        { path: "benchmarks", element: <DocPage /> },
        { path: "cli", element: <DocPage /> },
        { path: "contributing", element: <DocPage /> },
        { path: "guides", element: <DocPage /> },
        { path: "how-uhcr-works", element: <DocPage /> },
        { path: "multi-isa", element: <DocPage /> },
        { path: "network", element: <DocPage /> },
        { path: "plugins", element: <DocPage /> },
        { path: "reference", element: <DocPage /> },
        { path: "runtime", element: <DocPage /> },
        { path: "storage", element: <DocPage /> },
        { path: "containerization", element: <DocPage /> },
        { path: "benchmarks-docker", element: <DocPage /> },
        { path: "benchmarks-kubernetes", element: <DocPage /> },
        { path: "benchmarks-k8s", element: <DocPage /> },
        { path: "safety", element: <DocPage /> },
        { path: "safety-integration", element: <DocPage /> },
        { path: "ir-safety-summary", element: <DocPage /> },
        { path: "hardware-protection", element: <DocPage /> },
        { path: "integration-status", element: <DocPage /> },
      ],
    },
    {
      path: "*",
      element: (
        <>
          {" "}
          <Header /> <NotFound />
        </>
      ),
    },
  ],
  // 3. Optional: Removed basename as HashRouters typically don't need it on static hosts like GitHub Pages
);

export function Router() {
  return <RouterProvider router={router} />;
}
