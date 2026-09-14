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
global.localStorage = storage;
global.sessionStorage = storage;
if (typeof global.window === "undefined") {
  global.window = global;
}
global.window.localStorage = storage;
global.window.sessionStorage = storage;
if (typeof global.fetch !== "function") {
  global.fetch = () => Promise.reject(new Error("offline"));
}
