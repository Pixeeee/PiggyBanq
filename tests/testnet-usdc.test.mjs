import test from 'node:test';
import assert from 'node:assert/strict';
import { getTestnetUsdcStatus } from '../packages/stellar-core/src/testnet-usdc.ts';
const address='GB3JDWCQJCWMJ3IILWIGDTQJJCWMJ3IILWIGDTQJJC5567PGVEVXSCVPEQOTDN64VJBDQBYX';
const key='GB3JDWCQJCWMJ3IILWIGDTQJJC5567PGVEVXSCVPEQOTDN64VJBDQBYX';
const issuer='GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const line={asset_type:'credit_alphanum4',asset_code:'USDC',asset_issuer:issuer,balance:'20.0000000',limit:'1000000.0000000',buying_liabilities:'0.0000000',is_authorized:true};
const fetcher=(balances,status=200)=>async()=>new Response(JSON.stringify({account_id:key,balances}),{status});
test('USDC status validates addresses before requests',async()=>{let n=0;await assert.rejects(getTestnetUsdcStatus(address,{fetch:async()=>n++}),/valid Stellar/);assert.equal(n,0);});
test('USDC status distinguishes unfunded, missing, unauthorized and full trustlines',async()=>{
 for(const [lines,http,status] of [[[],404,'UNFUNDED'],[[],200,'TRUSTLINE_REQUIRED'],[[{...line,asset_issuer:key}],200,'TRUSTLINE_REQUIRED'],[[{...line,is_authorized:false}],200,'UNAUTHORIZED'],[[{...line,limit:'20.0000000'}],200,'FULL']])assert.equal((await getTestnetUsdcStatus(key,{fetch:fetcher(lines,http)})).status,status);
});
test('only the correct Testnet USDC issuer is confirmed, with a fixed public-only Horizon request',async()=>{let called;const result=await getTestnetUsdcStatus(key,{fetch:async(url,options)=>{called={url,options};return new Response(JSON.stringify({account_id:key,balances:[line]}));}});assert.equal(result.status,'READY');assert.equal(result.balance,'20.0000000');assert.equal(result.issuer,issuer);assert.equal(called.url,'https://horizon-testnet.stellar.org/accounts/'+key);assert.equal(called.options.credentials,'omit');assert.equal(called.options.body,undefined);});
test('unavailable or malformed USDC data never confirms a usable balance',async()=>{for(const data of [{balances:[{...line,balance:'NaN'}],account_id:key},{balances:[line],account_id:issuer},{balances:'invalid',account_id:key}])await assert.rejects(getTestnetUsdcStatus(key,{fetch:async()=>new Response(JSON.stringify(data))}));await assert.rejects(getTestnetUsdcStatus(key,{fetch:fetcher([],503)}),/unavailable/);});
