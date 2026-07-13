import type { KnipConfig } from "knip";

const config: KnipConfig = {
  entry: [
    "src/app/**/{page,layout,loading,error,route,not-found}.ts{x,}",
    "src/middleware.ts",
    "src/proxy.ts",
    "src/instrumentation.ts",
  ],
  project: ["src/**/*.{ts,tsx}"],
  ignoreDependencies: [
    "@types/node",
    "@types/react",
    "@types/react-dom",
    "tailwindcss",
    "eslint-config-next",
    "eslint-config-prettier",
  ],
  ignore: [
    "**/*.test.{ts,tsx}",
    "**/*.spec.{ts,tsx}",
    "tests/**",
    "src/app/api/**",
    "src/components/ui/**",
    "scripts/**",
    "*.config.*",
  ],
};

export default config;
