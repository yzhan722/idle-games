import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createMemoryStorage } from "./storage_memory";

function fakeSocket() {
  const messages: any[] = [];
  return {
    messages,
    send(text: string) {
      messages.push(JSON.parse(text));
    },
  };
}

describe("chat channel delivery", () => {
  it("does not deliver profession chat to a different class", async () => {
    const storage = createMemoryStorage();
    const wood = await storage.findOrCreateGuestUser("wood-dev");
    const smith = await storage.findOrCreateGuestUser("smith-dev");
    const woodState = await storage.getOrCreatePlayerState(wood.id, "1.0.0");
    const smithState = await storage.getOrCreatePlayerState(smith.id, "1.0.0");
    woodState.activeClassId = "woodcutter";
    smithState.activeClassId = "blacksmith";
    await storage.savePlayerState(wood.id, woodState);
    await storage.savePlayerState(smith.id, smithState);

    const woodSock = fakeSocket();
    const smithSock = fakeSocket();
    storage.wsConnect(wood.id, { socket: woodSock });
    storage.wsConnect(smith.id, { socket: smithSock });
    woodSock.messages.length = 0;
    smithSock.messages.length = 0;

    storage.wsMessage(wood.id, JSON.stringify({ type: "chat:send", channel: "profession", content: "only-wood" }));

    assert.equal(
      woodSock.messages.some((m) => m.content === "only-wood" && m.channel === "profession"),
      true
    );
    assert.equal(
      smithSock.messages.some((m) => m.content === "only-wood"),
      false
    );
    await storage.close();
  });

  it("delivers world chat to every connected player", async () => {
    const storage = createMemoryStorage();
    const a = await storage.findOrCreateGuestUser("a");
    const b = await storage.findOrCreateGuestUser("b");
    await storage.getOrCreatePlayerState(a.id, "1.0.0");
    await storage.getOrCreatePlayerState(b.id, "1.0.0");
    const sockA = fakeSocket();
    const sockB = fakeSocket();
    storage.wsConnect(a.id, { socket: sockA });
    storage.wsConnect(b.id, { socket: sockB });
    sockA.messages.length = 0;
    sockB.messages.length = 0;
    storage.wsMessage(a.id, JSON.stringify({ type: "chat:send", channel: "world", content: "hello-all" }));
    assert.equal(sockA.messages.some((m) => m.content === "hello-all"), true);
    assert.equal(sockB.messages.some((m) => m.content === "hello-all"), true);
    await storage.close();
  });

  it("accepts a raw socket the way Fastify websocket v11 passes it", async () => {
    const storage = createMemoryStorage();
    const user = await storage.findOrCreateGuestUser("raw-ws");
    await storage.getOrCreatePlayerState(user.id, "1.0.0");
    const sock = fakeSocket();
    storage.wsConnect(user.id, sock);
    sock.messages.length = 0;
    storage.wsMessage(user.id, JSON.stringify({ type: "chat:send", channel: "world", content: "raw-ok" }));
    assert.equal(sock.messages.some((m) => m.content === "raw-ok"), true);
    await storage.close();
  });
});
