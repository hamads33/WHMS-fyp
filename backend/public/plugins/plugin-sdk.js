// public/plugins/plugin-sdk.js
// Minimal Plugin SDK (iframe -> host) using postMessage
(function (global) {
  const HOST = window.parent;
  const callbacks = {};
  let cbId = 1;

  function isBridgeMessage(msg) {
    return msg && msg.__plugin_bridge;
  }

  function post(type, payload = {}) {
    const id = `cb_${cbId++}`;
    return new Promise((resolve, reject) => {
      callbacks[id] = { resolve, reject };
      HOST.postMessage({ __plugin_bridge: true, type, id, payload }, "*");
      // timeout
      setTimeout(() => {
        if (callbacks[id]) {
          delete callbacks[id];
          reject(new Error("timeout"));
        }
      }, 15000);
    });
  }

  function handleMessage(ev) {
    const d = ev.data;
    if (!isBridgeMessage(d)) return;
    const { id, payload, error } = d;
    if (!id) return;
    const cb = callbacks[id];
    if (!cb) return;
    if (error) cb.reject(error);
    else cb.resolve(payload);
    delete callbacks[id];
  }

  window.addEventListener("message", handleMessage, false);

  const sdk = {
    ping() {
      return post("ping", { ts: Date.now() });
    },
    getConfig() {
      return post("getConfig");
    },
    saveConfig(cfg) {
      return post("saveConfig", { cfg });
    },
    callAction(actionName, meta) {
      return post("callAction", { actionName, meta });
    },
    notify(event, data) {
      // fire-and-forget
      HOST.postMessage({ __plugin_bridge: true, type: "notify", payload: { event, data } }, "*");
    },
  };

  global.PluginSDK = sdk;
})(window);
