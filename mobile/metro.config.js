const path = require("node:path");
const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");

const project = __dirname;
const workspace = path.resolve(project, "..");

const config = {
  watchFolders: [workspace],
  resolver: {
    nodeModulesPaths: [path.join(project, "node_modules"), path.join(workspace, "node_modules")],
  },
};

module.exports = mergeConfig(getDefaultConfig(project), config);
