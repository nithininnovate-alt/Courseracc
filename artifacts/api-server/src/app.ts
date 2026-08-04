import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();
// Behind the Replit proxy: trust X-Forwarded-* so req.protocol/host reflect
// the public origin (used to build payment callback URLs).
app.set("trust proxy", true);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors({ credentials: true, origin: true }));
app.use(
  express.json({
    // Keep the raw body bytes for endpoints that must verify signatures over
    // the exact payload (e.g. Bank of Georgia payment callbacks).
    verify: (req, _res, buf) => {
      (req as { rawBody?: Buffer }).rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// On Replit-managed hosting, Clerk keys are provisioned per-domain and must
// be derived from the request host. On custom (self-hosted) domains that
// derivation yields a wrong Frontend API, so prefer the configured key.
const REPLIT_HOST_RE = /(\.replit\.app|\.replit\.dev|\.repl\.co)(:\d+)?$/i;
app.use(
  clerkMiddleware((req) => {
    const host = getClerkProxyHost(req) ?? "";
    const envKey = process.env.CLERK_PUBLISHABLE_KEY;
    return {
      publishableKey:
        envKey && !REPLIT_HOST_RE.test(host)
          ? envKey
          : publishableKeyFromHost(host, envKey),
    };
  }),
);

app.use("/api", router);

export default app;
