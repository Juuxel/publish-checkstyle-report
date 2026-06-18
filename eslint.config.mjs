// @ts-check

import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier/flat";

export default defineConfig(
  {
    files: ["**/*.{js,ts}"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
  },
  prettierConfig,
  globalIgnores(["dist/**", "lib/**"]),
);
