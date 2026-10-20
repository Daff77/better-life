const prettier = require("eslint-config-prettier");

module.exports = [
  {
    ignores: [
      "dist/**",
      ".expo/**",
      "node_modules/**",
      "web-build/**",
      "coverage/**",
    ],
  },
  prettier,
  {
    rules: {
      "no-unused-vars": "warn",
    },
  },
];
