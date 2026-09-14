/**
 * @format
 */

if (typeof globalThis.localStorage === "undefined") {
  const mem = Object.create(null);
  const storage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null),
    setItem: (k, v) => {
      mem[k] = String(v);
    },
    removeItem: (k) => {
      delete mem[k];
    },
    clear: () => {
      for (const k of Object.keys(mem)) delete mem[k];
    },
  };
  globalThis.localStorage = storage;
  if (typeof globalThis.sessionStorage === "undefined") {
    globalThis.sessionStorage = storage;
  }
  if (typeof globalThis.window === "undefined") {
    globalThis.window = globalThis;
  }
  if (globalThis.window && !globalThis.window.localStorage) {
    globalThis.window.localStorage = storage;
  }
  if (globalThis.window && !globalThis.window.sessionStorage) {
    globalThis.window.sessionStorage = storage;
  }
}

const { AppRegistry } = require("react-native");
const App = require("./src/os/App").default;
const { name: appName } = require("./app.json");

AppRegistry.registerComponent(appName, () => App);
