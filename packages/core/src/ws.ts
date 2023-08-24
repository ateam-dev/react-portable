import { ServerOptions, WebSocketServer } from "ws";

export const startWS = (option: ServerOptions) => {
  const wss = new WebSocketServer(option);

  wss.on("connection", function connection(ws) {
    ws.on("error", console.error);
    ws.on("message", console.log);
  });

  return wss;
};
