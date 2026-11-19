import { test } from "node:test";
import assert from "node:assert/strict";
import { setAccountScope } from "../accountScope";
import { chatHistoryKey, loadChatHistory, saveChatHistory } from "../chatHistory";
test("history survives reload, separates accounts, preserves write order and deletes", async () => {
 setAccountScope("alice-chat@test.local"); const key = chatHistoryKey();
 const thread = { id: "one", title: "Sarapan?", updatedAt: new Date().toISOString(), messages: [{ id: "m1", role: "user" as const, content: "Sarapan?", time: new Date().toISOString() }] };
 await saveChatHistory(key, [thread]); assert.deepEqual(await loadChatHistory(key), [thread]);
 setAccountScope("bob-chat@test.local"); assert.deepEqual(await loadChatHistory(chatHistoryKey()), []);
 assert.notEqual(chatHistoryKey(), key);
 setAccountScope("alice-chat@test.local");
 await Promise.all([saveChatHistory(key, [thread]), saveChatHistory(key, [])]);
 assert.deepEqual(await loadChatHistory(key), []);
});
