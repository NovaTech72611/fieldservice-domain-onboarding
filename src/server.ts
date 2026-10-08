import { createServer } from "node:http";
import { onboardWorkOrder } from "./service.js";
import { ZodError } from "zod";

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/work-orders/follow-up") {
    response.writeHead(404).end();
    return;
  }
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const result = await onboardWorkOrder(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(result));
  } catch (error) {
    const status = error instanceof ZodError ? 400 : 502;
    response.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify({ error: error instanceof Error ? error.message : "request failed" }));
  }
});

server.listen(Number(process.env.PORT ?? 3000), () => console.log("field-service service listening on port 3000"));
