// Run only against a development server backed by a disposable test database.
import assert from 'node:assert/strict';
const suffix=Date.now();
async function call(base,path,body,extra={}){
 const r=await fetch(base+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...extra},...(body?{body:JSON.stringify(body)}:{})});
 return {status:r.status,data:await r.json(),cookies:r.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ')};
}
const starz=process.env.TEST_BASE_URL || 'http://127.0.0.1:5102';
const s=await call(starz,'/api/auth/register',{username:`review_${suffix}`,email:`review-${suffix}@example.com`,password:'Password-Test-123!'});
assert.equal(s.status,201);
assert.equal((await call(starz,'/api/auth/me',null,{Authorization:`Bearer ${s.data.data.tokens.access}`})).status,200);
assert.equal((await call(starz,'/api/auth/me',null,{Authorization:`Bearer ${s.data.data.tokens.refresh}`})).status,401);
console.log('PASS STARZ: registration, authenticated profile, refresh-token rejection on access route');
