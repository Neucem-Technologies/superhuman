const path = require("node:path");

const SRC = path.resolve(__dirname, "../src");

function rewrite(source) {
  if (typeof source === "string" && source.startsWith("@/")) {
    return path.join(SRC, source.slice(2));
  }
  return source;
}

module.exports = function babelAlias() {
  return {
    name: "livinsync-alias",
    visitor: {
      ImportDeclaration(p) {
        p.node.source.value = rewrite(p.node.source.value);
      },
      ExportDeclaration(p) {
        if (p.node.source) p.node.source.value = rewrite(p.node.source.value);
      },
      CallExpression(p) {
        if (p.node.callee.name === "require" && p.node.arguments[0]?.value) {
          p.node.arguments[0].value = rewrite(p.node.arguments[0].value);
        }
      },
    },
  };
};
