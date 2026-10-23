import { createApp } from "./app.ts";
import { closeDatabase } from "./db/client.ts";

const app = createApp();
const server = Deno.serve(
  {
    hostname: "127.0.0.1",
    port: 8000,
    onListen() {
      console.log("Movie Reviews: http://localhost:8000/login");
    },
  },
  async (request, info) =>
    await app.handle(request, info.remoteAddr) ??
      new Response(null, { status: 404 }),
);
let stopping = false;
const stop = () => {
  if (stopping) return;
  stopping = true;
  console.log("Stopping server...");
  // set connection timeout
  const timeout = setTimeout(() => Deno.exit(0), 5000);
  Deno.unrefTimer(timeout);
  void server.shutdown();
};
Deno.addSignalListener("SIGINT", stop);
Deno.addSignalListener("SIGTERM", stop);
try {
  await server.finished;
} finally {
  Deno.removeSignalListener("SIGINT", stop);
  Deno.removeSignalListener("SIGTERM", stop);
  await closeDatabase();
}
