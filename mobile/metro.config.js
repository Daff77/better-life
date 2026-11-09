const http = require("http");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

const { transformer, resolver, server } = config;

config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve("react-native-svg-transformer"),
};
config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter((ext) => ext !== "svg"),
  sourceExts: [...resolver.sourceExts, "svg"],
};
let androidPrewarmStarted = false;

config.server = {
  ...server,
  enhanceMiddleware: (middleware) => {
    if (!androidPrewarmStarted) {
      androidPrewarmStarted = true;
      const timer = setTimeout(() => {
        const prewarmReq = http.get(
          "http://127.0.0.1:8081/node_modules/expo-router/entry.bundle?platform=android&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.bytecode=1&transform.routerRoot=app&unstable_transformProfile=hermes-stable",
          (res) => {
            res.resume();
          }
        );
        prewarmReq.on("error", () => {});
      }, 1500);
      if (typeof timer.unref === "function") {
        timer.unref();
      }
    }

    return (req, res, next) => {
      if (
        req.url &&
        (req.url.startsWith("/api/") ||
          req.url === "/api" ||
          req.url === "/health")
      ) {
        const proxyReq = http.request(
          {
            hostname: "127.0.0.1",
            port: 4000,
            path: req.url,
            method: req.method,
            headers: {
              ...req.headers,
              host: "127.0.0.1:4000",
            },
          },
          (proxyRes) => {
            res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
            proxyRes.pipe(res, { end: true });
          }
        );
        proxyReq.on("error", (err) => {
          res.statusCode = 502;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({ error: "Bad Gateway", message: err.message })
          );
        });
        req.pipe(proxyReq, { end: true });
        return;
      }
      return middleware(req, res, next);
    };
  },
};

module.exports = withNativeWind(config, { input: "./styles/global.css" });
