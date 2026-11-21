const { defineConfig } = require("eslint/config");
const expo = require("eslint-config-expo/flat");
module.exports = defineConfig([
  expo,
  { ignores: ["dist/**"] },
  {
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
    },
  },
]);
