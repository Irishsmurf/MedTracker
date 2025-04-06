    // functions/eslint.config.js
    import globals from "globals";
    import pluginJs from "@eslint/js";
    import tseslint from "typescript-eslint";
    // Import any other specific plugins for functions if needed

    export default [
      // 1. Global ignores for this functions project
      {
        ignores: [
            "node_modules/",
            "lib/", // Ignore compiled output
            // Add other ignores specific to functions if needed
          ],
      },

      // 2. Base recommended rules
      pluginJs.configs.recommended,

      // 3. TypeScript specific configuration for functions code
      ...tseslint.config(
        {
          files: ["src/**/*.ts"], // Target only TS files in src
          extends: [
              ...tseslint.configs.recommended,
              // Add 'plugin:import/typescript' if you use eslint-plugin-import
          ],
          languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
              project: true, // Use tsconfig.json for type-aware rules
              tsconfigRootDir: import.meta.dirname, // Locates tsconfig relative to this config file
            },
            // Define Node.js environment globals
            globals: {
              ...globals.node, // Defines 'require', 'module', 'exports', 'process', etc.
            },
          },
          plugins: {
            "@typescript-eslint": tseslint.plugin,
            // 'import': pluginImport, // Add if using eslint-plugin-import
          },
          rules: {
            // Use the TS version of no-unused-vars
            "no-unused-vars": "off",
            "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
            // Add/override other rules suitable for backend Node.js code
            // Examples:
            // "import/no-unresolved": 0, // Often needed with TS paths
            // "@typescript-eslint/explicit-module-boundary-types": "off", // If you don't require return types everywhere
          },
        }
      ),
    ];
    