import { createServer } from "http";
import { app } from "./app.js";
import { initSocket } from "./lib/socket.js";

const httpServer = createServer(app);
const port = 8000;

initSocket(httpServer);

httpServer.listen(port, () => {
    console.log(`Better Auth app + WebSockets listening on port ${port}`);
});
