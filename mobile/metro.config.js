const http = require("http");
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);
const sharedDir = path.resolve(__dirname, "../shared");
config.watchFolders = [sharedDir];

const { transformer, resolver, server } = config;
const defaultResolveRequest = resolver.resolveRequest;

config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve("react-native-svg-transformer"),
};
config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter((ext) => ext !== "svg"),
  sourceExts: [...resolver.sourceExts, "svg"],
  extraNodeModules: {
    ...(resolver.extraNodeModules || {}),
    "@better-life/shared": sharedDir,
  },
  resolveRequest: (context, moduleName, platform) => {
    if (moduleName === "@better-life/shared") {
      return {
        filePath: path.join(sharedDir, "index.js"),
        type: "sourceFile",
      };
    }
    if (defaultResolveRequest) {
      return defaultResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
  },
};

let androidPrewarmStarted = false;

config.server = {
  ...server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      if (!androidPrewarmStarted && req.socket && req.socket.localPort) {
        androidPrewarmStarted = true;
        const activePort = req.socket.localPort;
        const timer = setTimeout(() => {
          const prewarmReq = http.get(
            `http://127.0.0.1:${activePort}/node_modules/expo-router/entry.bundle?platform=android&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.bytecode=1&transform.routerRoot=app&unstable_transformProfile=hermes-stable`,
            (prewarmRes) => {
              prewarmRes.resume();
            }
          );
          prewarmReq.on("error", () => {});
        }, 1200);
        if (typeof timer.unref === "function") {
          timer.unref();
        }
      }

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
