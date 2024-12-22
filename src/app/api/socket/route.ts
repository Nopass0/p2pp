// app/api/socket/route.ts
import { type NextRequest } from "next/server";
import { WebSocket, WebSocketServer } from "ws";

const wss = new WebSocketServer({ noServer: true });

export async function GET(req: NextRequest) {
  if (req.headers.get("upgrade") !== "websocket") {
    return new Response("Expected websocket", { status: 400 });
  }

  const { socket: serverSocket, response } = await new Promise<any>(
    (resolve) => {
      //@ts-ignore

      wss.handleUpgrade(req, req.socket, Buffer.alloc(0), (ws) => {
        ws.on("message", (message: string) => {
          console.log("Received:", message.toString());
          // Отправляем ответ обратно
          ws.send(
            JSON.stringify({
              status: "success",
              message: `Получено: ${message.toString()}`,
            }),
          );
        });

        const response = new Response(null, {
          status: 101,
          headers: {
            Upgrade: "websocket",
            Connection: "Upgrade",
          },
        });
        resolve({ socket: ws, response });
      });
    },
  );

  return response;
}
