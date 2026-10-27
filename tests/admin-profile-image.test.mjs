import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function route({session={id:1},image={data:Buffer.from([1,2,3]),mime:'image/png'}}={}) {
 const calls=[];
 const exports={};
 const dependencies={
  '@/lib/auth':{getAdminSession:async()=>session},
  '@/lib/db':{db:{execute:async(sql,params)=>{calls.push({sql,params});return [image?[image]:[]];}}},
 };
 const source=fs.readFileSync(new URL('../src/app/api/admin/profile-image/route.ts',import.meta.url),'utf8');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,URL,Response,Uint8Array,Buffer,require(name){if(dependencies[name])return dependencies[name];throw Error(name);}});
 return {get:reference=>exports.GET(new Request('https://school.example/api/admin/profile-image?ref='+encodeURIComponent(reference))),calls};
}

test('profile image requires admin session before any database read',async()=>{
 const app=route({session:null});
 assert.equal((await app.get('S7')).status,401);
 assert.equal(app.calls.length,0);
});

test('profile image rejects unsupported or malformed references before database read',async()=>{
 const app=route();
 for(const id of ['A1','S0','T-1','S7 OR 1=1','S1; DROP TABLE students','S999999999999999',''])assert.equal((await app.get(id)).status,400);
 assert.equal(app.calls.length,0);
});

test('profile image reads only the selected profile table with bound numeric ID and private response',async()=>{
 for(const [id,table] of [['S7','students'],['T9','teachers']]) {
  const app=route();const response=await app.get(id);
  assert.equal(response.status,200);
  assert.match(app.calls[0].sql,new RegExp('FROM '+table+' WHERE id=\\?'));
  assert.equal(app.calls[0].params[0],Number(id.slice(1)));
  assert.equal(response.headers.get('content-type'),'image/png');
  assert.equal(response.headers.get('cache-control'),'private, no-store');
  assert.equal(response.headers.get('x-content-type-options'),'nosniff');
  assert.deepEqual([...new Uint8Array(await response.arrayBuffer())],[1,2,3]);
 }
});

test('profile image returns 404 for missing images or unsupported active content',async()=>{
 assert.equal((await route({image:null}).get('S7')).status,404);
 assert.equal((await route({image:{data:Buffer.from('<svg/>'),mime:'image/svg+xml'}}).get('S7')).status,404);
});
