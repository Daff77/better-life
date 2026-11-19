import { closeDatabase } from "../db/index.js";
after(() => closeDatabase());
import { test, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../index.js";
test("chat database persists history, isolates accounts and prevents deleted chats returning", async () => {
 async function register(prefix:string) { const r=await request(app).post("/api/auth/register").send({name:"Test",email:prefix+Date.now()+"@test.local",password:"Password123!"}); assert.equal(r.status,201); return r.body.token; }
 const a=await register("a"); const b=await register("b"); const path="/api/assistant/history";
 const thread={id:"one",title:"Menu",updatedAt:new Date().toISOString(),messages:[{id:"m",role:"user",content:"Menu?",time:new Date().toISOString()}]};
 assert.equal((await request(app).put(path+"/one").auth(a,{type:"bearer"}).send(thread)).status,200);
 assert.equal((await request(app).get(path).auth(a,{type:"bearer"})).body.threads[0].title,"Menu");
 assert.deepEqual((await request(app).get(path).auth(b,{type:"bearer"})).body.threads,[]);
 await request(app).delete(path+"/one").auth(b,{type:"bearer"});
 assert.equal((await request(app).get(path).auth(a,{type:"bearer"})).body.threads.length,1);
 await request(app).delete(path+"/one").auth(a,{type:"bearer"});
 await request(app).put(path+"/one").auth(a,{type:"bearer"}).send(thread);
 assert.deepEqual((await request(app).get(path).auth(a,{type:"bearer"})).body.threads,[]);
});
