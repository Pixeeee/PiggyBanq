import test from 'node:test';
import assert from 'node:assert/strict';
import { fontFamily } from '../apps/mobile/src/ui/font-family.ts';
test('native typography uses landing families at each supported weight',()=>{
 for(const weight of [400,500,600,700,800,900])assert.equal(fontFamily(String(weight)),`Geist-${weight}`);
 assert.equal(fontFamily('bold'),'Geist-700');
 assert.equal(fontFamily('normal'),'Geist-400');
 assert.equal(fontFamily('700',true),'Grandstander-700');
});
