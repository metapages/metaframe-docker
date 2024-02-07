import { oakCors } from 'https://deno.land/x/cors@v1.2.2/mod.ts';
import {
  Application,
  Router,
} from 'https://deno.land/x/oak@v10.2.0/mod.ts';
import staticFiles from 'https://deno.land/x/static_files@1.1.6/mod.ts';

const port: number = parseInt(Deno.env.get("PORT") || "3000");

const router = new Router();

const app = new Application();
app.addEventListener("listen", ({ hostname, port, secure }) => {
  console.log(
    `🚀 Listening on: ${secure ? "https://" : "http://"}${
      hostname ?? "localhost"
    }:${port}`,
  );
});
app.use(oakCors({ origin: "*" }));
app.use(
  staticFiles("browser", {
    prefix: "/",
    setHeaders: (headers: Headers) => {
      headers.set("Access-Control-Allow-Origin", "*");
    },
  })
);
app.use(router.routes());
app.use(router.allowedMethods());

// await app.listen({ port, certFile, keyFile });
await app.listen({ port });
