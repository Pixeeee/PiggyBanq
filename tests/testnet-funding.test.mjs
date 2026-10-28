import test from 'node:test';
import assert from 'node:assert/strict';
import { requestTestnetXlm } from '../packages/stellar-core/src/testnet-funding.ts';
const address='GB3JDWCQJCWMJ3IILWIGDTQJJC5567PGVEVXSCVPEQOTDN64VJBDQBYX';
const account=(balance='10000.0000000',key=address)=>({account_id:key,balances:[{asset_type:'native',balance}]});
const response=(data,status=200)=>new Response(JSON.stringify(data),{status});
function harness(replies){const calls=[];return {calls,fetch:async(url,options)=>{calls.push({url:String(url),options});const next=replies.shift();assert.ok(next,'unexpected network request');if(next instanceof Error)throw next;return response(...next);},wait:async()=>{}};}
test('faucet rejects invalid addresses before network access',async()=>{let calls=0;await assert.rejects(requestTestnetXlm('secret',{fetch:async()=>{calls++;}}),/valid Stellar public/);assert.equal(calls,0);});
test('faucet sends only a public address to fixed Testnet hosts and verifies funding on Horizon',async()=>{const h=harness([[{},404],[{}],[{},404],[account()]]);const result=await requestTestnetXlm(address,h);assert.deepEqual(result,{status:'FUNDED',balance:'10000.0000000'});assert.deepEqual(h.calls.map(c=>new URL(c.url).hostname),['horizon-testnet.stellar.org','friendbot.stellar.org','horizon-testnet.stellar.org','horizon-testnet.stellar.org']);const faucet=h.calls[1];assert.equal(new URL(faucet.url).searchParams.get('addr'),address);assert.equal(faucet.options.credentials,'omit');assert.equal(faucet.options.body,undefined);});
test('existing funded wallets get an honest already-funded result after a faucet refusal',async()=>{const h=harness([[account('123.0000000')],[{},400],[account('123.0000000')]]);assert.deepEqual(await requestTestnetXlm(address,h),{status:'ALREADY_FUNDED',balance:'123.0000000'});});
test('faucet acceptance without a verified increase never claims success',async()=>{const h=harness([[account('123.0000000')],[{}],...Array.from({length:6},()=>[account('123.0000000')])]);await assert.rejects(requestTestnetXlm(address,h),/not confirmed/);});
test('rate limits, outages and malformed/wrong-account balances are handled safely',async()=>{for(const replies of [[[{},404],[{},429]],[[{},503]],[[account('NaN')]],[[account('10.0000000','G'+'A'.repeat(55))]]]){await assert.rejects(requestTestnetXlm(address,harness(replies)),/Try again later|invalid|unavailable/);}});
test('simultaneous funding requests for the same wallet share one faucet call',async()=>{const h=harness([[{},404],[{}],[account()]]);const a=requestTestnetXlm(address,h);const b=requestTestnetXlm(address,h);assert.equal(a,b);await Promise.all([a,b]);assert.equal(h.calls.filter(c=>c.url.includes('friendbot')).length,1);});
test('redirected and failed network responses never trigger faucet success or leak upstream errors',async()=>{
 const redirected=response(account());Object.defineProperty(redirected,'url',{value:'https://horizon.stellar.org/accounts/'+address});
 await assert.rejects(requestTestnetXlm(address,{fetch:async()=>redirected}),/unavailable/);
 await assert.rejects(requestTestnetXlm(address,harness([[{},404],new Error('private upstream diagnostics')])),error=>error.message.includes('unavailable')&&!error.message.includes('private upstream'));
});
