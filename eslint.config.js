import js from "@eslint/js";
import tseslint from "typescript-eslint";
import lit from "eslint-plugin-lit";

export default [
  // 🔕 Cosas que nunca se lintéan
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "custom-elements.json"
    ]
  },

  // 📦 JavaScript base
  js.configs.recommended,

  // 🟦 TypeScript
  ...tseslint.configs.recommended,

  // 🛠️ Herramientas Node y callbacks que Playwright ejecuta en el navegador
  {
    files: ["tools/**/*.mjs"],
    languageOptions: {
      globals: {
        AbortSignal: "readonly",
        Buffer: "readonly",
        URL: "readonly",
        customElements: "readonly",
        document: "readonly",
        fetch: "readonly",
        localStorage: "readonly",
        process: "readonly",
        setTimeout: "readonly",
        window: "readonly"
      }
    }
  },

  // 🔥 Reglas específicas para Lit
  {
    files: ["**/*.ts", "**/*.js"],
    plugins: {
      lit
    },
    rules: {
      "lit/no-invalid-html": "error",
      "lit/no-duplicate-template-bindings": "error",
      "lit/no-useless-template-literals": "warn"
    }
  },

  // 🧾 HTML (templates Lit en archivos .html)
  {
    files: ["**/*.html"],
    languageOptions: {
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module"
      }
    }
  }
];
