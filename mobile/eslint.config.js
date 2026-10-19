const prettier = require("eslint-config-prettier");

module.exports = [
  prettier,
  {
    rules: {
      "no-unused-vars": "warn",
    },
  },
];
