/**
 * Cloudflare Worker with Durable Objects for Booshnam Real-Time Chat & Client Messaging
 * 
 * Deploy with Wrangler:
 * npx wrangler deploy
 * 
 * wrangler.toml configuration:
 * name = "booshnam-chat"
 * main = "cloudflare-chat-worker.js"
 * compatibility_date = "2024-09-23"
 * 
 * [durable_objects]
 * bindings = [
 *   { name = "CHAT_ROOM", class_name = "BooshnamChatRoom" }
 * ]
 * 
 * [[migrations]]
 * tag = "v1"
 * new_classes = ["BooshnamChatRoom"]
 */

export class BooshnamChatRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Set();
  }

  async fetch(request) {
    const url = new URL(request.url);

    // WebSocket Upgrade for Real-Time Live Messaging
    if (request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      await this.handleWebSocket(server);
      return new Response(null, { status: 101, webSocket: client });
    }

    // REST API fallback for posting messages and polling history
    if (url.pathname === "/api/messages" && request.method === "POST") {
      const message = await request.json();
      message.id = message.id || `msg-${Date.now()}`;
      message.timestamp = message.timestamp || Date.now();

      // Store in Durable Object persistent storage
      let history = (await this.state.storage.get("messages")) || [];
      history.push(message);
      if (history.length > 500) history = history.slice(-500); // keep recent 500
      await this.state.storage.put("messages", history);

      // Broadcast to all connected active WebSocket sessions
      this.broadcast(JSON.stringify({ type: "NEW_MESSAGE", message }));

      return new Response(JSON.stringify({ success: true, message }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    if (url.pathname === "/api/messages" && request.method === "GET") {
      const history = (await this.state.storage.get("messages")) || [];
      return new Response(JSON.stringify(history), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    return new Response("Booshnam Cloudflare Durable Object Chat Room Active", { status: 200 });
  }

  async handleWebSocket(webSocket) {
    webSocket.accept();
    this.sessions.add(webSocket);

    // Send recent message history to newly connected client
    const history = (await this.state.storage.get("messages")) || [];
    webSocket.send(JSON.stringify({ type: "INIT_HISTORY", messages: history }));

    webSocket.addEventListener("message", async (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data.type === "SEND_MESSAGE") {
          let history = (await this.state.storage.get("messages")) || [];
          history.push(data.message);
          if (history.length > 500) history = history.slice(-500);
          await this.state.storage.put("messages", history);

          this.broadcast(JSON.stringify({ type: "NEW_MESSAGE", message: data.message }));
        }
      } catch (err) {
        console.error("Error processing websocket message", err);
      }
    });

    webSocket.addEventListener("close", () => {
      this.sessions.delete(webSocket);
    });

    webSocket.addEventListener("error", () => {
      this.sessions.delete(webSocket);
    });
  }

  broadcast(messageStr) {
    for (const session of this.sessions) {
      try {
        session.send(messageStr);
      } catch (err) {
        this.sessions.delete(session);
      }
    }
  }
}

export default {
  async fetch(request, env) {
    // Enable CORS for web client
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        }
      });
    }

    // Route to Default Durable Object Room
    const id = env.CHAT_ROOM.idFromName("BooshnamMasterChatRoom");
    const roomObject = env.CHAT_ROOM.get(id);

    const response = await roomObject.fetch(request);
    const newHeaders = new Headers(response.headers);
    newHeaders.set("Access-Control-Allow-Origin", "*");
    return new Response(response.body, {
      status: response.status,
      headers: newHeaders
    });
  }
};
