import type { NavItem, DocRoute } from "../types";

const docsBase = `${import.meta.env.BASE_URL}docs/`;

// Route-to-markdown mapping
export const docRoutes: DocRoute[] = [
  {
    path: "/docs/introduction",
    markdownFile: `${docsBase}index.md`,
    title: "Introduction",
  },
  {
    path: "/docs/installation",
    markdownFile: `${docsBase}README.md`,
    title: "Installation",
  },
  {
    path: "/docs/quickstart",
    markdownFile: `${docsBase}quickstart.md`,
    title: "Quick Start",
  },
  {
    path: "/docs/how-uhcr-works",
    markdownFile: `${docsBase}how-uhcr-works.md`,
    title: "How UHCR Works",
  },
  {
    path: "/docs/architecture",
    markdownFile: `${docsBase}architecture.md`,
    title: "Runtime Architecture",
  },
  {
    path: "/docs/runtime",
    markdownFile: `${docsBase}runtime.md`,
    title: "Runtime Engine",
  },
  {
    path: "/docs/storage",
    markdownFile: `${docsBase}storage.md`,
    title: "Storage and Caching",
  },
  {
    path: "/docs/hardware-reference",
    markdownFile: `${docsBase}hardware-reference.md`,
    title: "Hardware Reference",
  },
  {
    path: "/docs/jit-guide",
    markdownFile: `${docsBase}jit-guide.md`,
    title: "JIT Compilation",
  },
  {
    path: "/docs/plugin-guide",
    markdownFile: `${docsBase}plugin-guide.md`,
    title: "Plugin Development Guide",
  },
  {
    path: "/docs/plugins",
    markdownFile: `${docsBase}plugins.md`,
    title: "Plugin System Architecture",
  },
  {
    path: "/docs/multi-isa",
    markdownFile: `${docsBase}multi-isa.md`,
    title: "Multi-ISA Support",
  },
  {
    path: "/docs/features",
    markdownFile: `${docsBase}features.md`,
    title: "Features Matrix",
  },
  {
    path: "/docs/guides",
    markdownFile: `${docsBase}guides.md`,
    title: "Guides Index",
  },
  {
    path: "/docs/containerization",
    markdownFile: `${docsBase}containerization.md`,
    title: "Docker Deployment",
  },
  {
    path: "/docs/benchmarks-docker",
    markdownFile: `${docsBase}benchmarks_docker.md`,
    title: "Docker Benchmarks",
  },
  {
    path: "/docs/benchmarks-kubernetes",
    markdownFile: `${docsBase}benchmarks_kubernetes.md`,
    title: "Kubernetes Deployment",
  },
  {
    path: "/docs/benchmarks-k8s",
    markdownFile: `${docsBase}benchmarks_k8s.md`,
    title: "Kubernetes Benchmarks",
  },
  {
    path: "/docs/network",
    markdownFile: `${docsBase}network.md`,
    title: "Distributed Networking",
  },
  {
    path: "/docs/api-reference",
    markdownFile: `${docsBase}api-reference.md`,
    title: "API Reference",
  },
  {
    path: "/docs/cli",
    markdownFile: `${docsBase}cli.md`,
    title: "CLI Reference",
  },
  {
    path: "/docs/reference",
    markdownFile: `${docsBase}reference.md`,
    title: "Reference Index",
  },
  {
    path: "/docs/benchmarks",
    markdownFile: `${docsBase}benchmarks.md`,
    title: "Performance Tuning",
  },
  {
    path: "/docs/safety",
    markdownFile: `${docsBase}safety.md`,
    title: "Security & Safety",
  },
  {
    path: "/docs/safety-integration",
    markdownFile: `${docsBase}safety-integration.md`,
    title: "Safety Integration",
  },
  {
    path: "/docs/ir-safety-summary",
    markdownFile: `${docsBase}ir-safety-summary.md`,
    title: "IR Safety Summary",
  },
  {
    path: "/docs/hardware-protection",
    markdownFile: `${docsBase}hardware-protection.md`,
    title: "Hardware Protection",
  },
  {
    path: "/docs/contributing",
    markdownFile: `${docsBase}contributing.md`,
    title: "Contributing Guide",
  },
  {
    path: "/docs/integration-status",
    markdownFile: `${docsBase}integration-status.md`,
    title: "Integration Status",
  },
];

// Navigation structure
export const navigation: NavItem[] = [
  {
    id: "getting-started",
    label: "Getting Started",
    path: "/docs/introduction",
    children: [
      { id: "introduction", label: "Introduction", path: "/docs/introduction" },
      { id: "installation", label: "Installation", path: "/docs/installation" },
      { id: "quickstart", label: "Quick Start", path: "/docs/quickstart" },
    ],
  },
  {
    id: "core-concepts",
    label: "Core Concepts",
    path: "/docs/how-uhcr-works",
    children: [
      { id: "how-it-works", label: "How UHCR Works", path: "/docs/how-uhcr-works" },
      { id: "architecture", label: "Runtime Architecture", path: "/docs/architecture" },
      { id: "runtime", label: "Runtime Engine", path: "/docs/runtime" },
      { id: "storage", label: "Storage and Caching", path: "/docs/storage" },
      { id: "hardware-reference", label: "Hardware Detection", path: "/docs/hardware-reference" },
    ],
  },
  {
    id: "development-guides",
    label: "Development Guides",
    path: "/docs/jit-guide",
    children: [
      { id: "jit-guide", label: "JIT Compilation", path: "/docs/jit-guide" },
      { id: "plugin-guide", label: "Plugin Development", path: "/docs/plugin-guide" },
      { id: "plugins", label: "Plugin System", path: "/docs/plugins" },
      { id: "multi-isa", label: "Multi-ISA Support", path: "/docs/multi-isa" },
      { id: "features", label: "Features Matrix", path: "/docs/features" },
      { id: "guides", label: "Guides Index", path: "/docs/guides" },
    ],
  },
  {
    id: "deployment",
    label: "Deployment",
    path: "/docs/containerization",
    children: [
      { id: "containerization", label: "Docker Deployment", path: "/docs/containerization" },
      { id: "benchmarks-docker", label: "Docker Benchmarks", path: "/docs/benchmarks-docker" },
      { id: "benchmarks-kubernetes", label: "Kubernetes Deployment", path: "/docs/benchmarks-kubernetes" },
      { id: "benchmarks-k8s", label: "Kubernetes Benchmarks", path: "/docs/benchmarks-k8s" },
      { id: "network", label: "Distributed Networking", path: "/docs/network" },
    ],
  },
  {
    id: "reference",
    label: "Reference",
    path: "/docs/api-reference",
    children: [
      { id: "api-reference", label: "API Reference", path: "/docs/api-reference" },
      { id: "cli", label: "CLI Reference", path: "/docs/cli" },
      { id: "reference-index", label: "Reference Index", path: "/docs/reference" },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    path: "/docs/benchmarks",
    children: [
      { id: "benchmarks", label: "Performance Tuning", path: "/docs/benchmarks" },
      { id: "safety", label: "Security & Safety", path: "/docs/safety" },
      { id: "safety-integration", label: "Safety Integration", path: "/docs/safety-integration" },
      { id: "ir-safety-summary", label: "IR Safety Summary", path: "/docs/ir-safety-summary" },
      { id: "hardware-protection", label: "Hardware Protection", path: "/docs/hardware-protection" },
    ],
  },
  {
    id: "community",
    label: "Community",
    path: "/docs/contributing",
    children: [
      { id: "contributing", label: "Contributing", path: "/docs/contributing" },
      { id: "integration-status", label: "Integration Status", path: "/docs/integration-status" },
    ],
  },
];

// Helper function to get markdown file for a path
export function getMarkdownFile(path: string): string | undefined {
  const route = docRoutes.find((r) => r.path === path);
  return route?.markdownFile;
}

// Helper function to get page title for a path
export function getPageTitle(path: string): string {
  const route = docRoutes.find((r) => r.path === path);
  return route?.title || "UHCR Documentation";
}
