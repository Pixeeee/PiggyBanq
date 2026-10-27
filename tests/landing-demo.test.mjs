import test from 'node:test';
import assert from 'node:assert/strict';
import { projectSavings, advanceDemo } from '../apps/web/app/components/landing/demo.ts';

test('savings demo projects exact minor units without interest and caps at the goal',()=>{
 assert.deepEqual(projectSavings({monthlyMinor:50000,months:6,targetMinor:1000000,extraMinor:0}),{savedMinor:300000,remainingMinor:700000,percent:30,monthsToGoal:20});
 assert.deepEqual(projectSavings({monthlyMinor:50000,months:24,targetMinor:1000000,extraMinor:50000}),{savedMinor:1000000,remainingMinor:0,percent:100,monthsToGoal:19});
 assert.equal(projectSavings({monthlyMinor:0,months:6,targetMinor:1000000,extraMinor:0}).monthsToGoal,null);
});
test('savings demo rejects negative, fractional, non-finite and unsafe money values',()=>{
 for(const monthlyMinor of [-1,.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1]) assert.throws(()=>projectSavings({monthlyMinor,months:6,targetMinor:1000000,extraMinor:0}),RangeError);
 assert.throws(()=>projectSavings({monthlyMinor:1,months:1,targetMinor:0,extraMinor:0}),RangeError);
});
test('agent demo cannot execute or finish without the explicit approval step',()=>{
 assert.equal(advanceDemo('idle','approve'),'idle');
 assert.equal(advanceDemo('previewing','finish'),'previewing');
 let state='idle';for(const event of ['preview','ready','approve','finish'])state=advanceDemo(state,event);
 assert.equal(state,'complete');
 assert.equal(advanceDemo('awaiting-approval','finish'),'awaiting-approval');
 assert.equal(advanceDemo('executing','reset'),'idle');
 assert.equal(advanceDemo('idle','finish'),'idle');
});
