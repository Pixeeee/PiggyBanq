import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeDashboardActivity } from '../packages/stellar-core/src/dashboard-activity.ts';
test('dashboard flow preserves exact units, separates assets and excludes failed/self/malformed payments', () => {
 const entry = {successful:true, assetCode:'XLM', amountUnits:'9007199254740993', direction:'IN'};
 const result=summarizeDashboardActivity([entry, {...entry, amountUnits:'2',direction:'OUT'}, {...entry,successful:false}, {...entry,assetCode:'USDC'}, {...entry,direction:'SELF'}, {...entry,amountUnits:'oops'}],'XLM');
 assert.equal(result.received,'9007199254740993'); assert.equal(result.sent,'2'); assert.equal(result.count,2);
 assert.equal(result.points.at(-1).received,100); assert.equal(result.points.at(-1).sent,0);
 assert.deepEqual(summarizeDashboardActivity([],'XLM').points,[{received:0,sent:0}]);
 assert.equal(summarizeDashboardActivity([{...entry,amountUnits:'0'}],'XLM').points.at(-1).received,0);
});
