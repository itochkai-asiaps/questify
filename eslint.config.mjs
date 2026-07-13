import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import eslintConfigPrettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
  ]),
  {
    rules: {
      // Intentional patterns: data fetching in useEffect on mount
      "react-hooks/set-state-in-effect": "off",
      // Intentional: ref syncing for latest value access in callbacks
      "react-hooks/refs": "off",
    },
  },
  // Prettier: must be last to override all formatting rules
  eslintConfigPrettier,
]);

export default eslintConfig;
