module.exports = {
  plugins: ["unused-imports"],
  overrides: [
    {
      files: ["**/*.js"],
      parserOptions: {
        sourceType: "commonjs",
      },
      rules: {
        "unused-imports/no-unused-imports": "error",
      },
    },
    {
      files: ["**/*.js"],
      globals: {
        ...require("globals").browser,
      },
    },
    {
      files: ["**/*.js"],
      extends: ["plugin:@eslint/js/recommended"],
    },
  ],
};
