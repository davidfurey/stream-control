module.exports = {
  rootDir: "./",
  preset: "ts-jest/presets/js-with-ts",
  globals: {
      "ts-jest": {
            babelConfig: {
                presets: [
                    [
                        "@babel/preset-env",
                        { targets: { node: "10" }, modules: "cjs" },
                    ],
                    [
                        "@babel/preset-react",
                        {
                            "runtime": "automatic"
                        }
                    ],
                ],
            },
          tsconfig: "tsconfig.test.json",
      },
  },
  moduleDirectories: ["node_modules", "src"],
};