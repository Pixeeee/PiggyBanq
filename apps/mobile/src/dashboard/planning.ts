import { parseStellarAmount } from '@piggybanq/stellar-core/amounts';

export type DashboardAllocation = { id: string; name: string; amount: string; currency: 'PHP' | 'USD' | 'XLM' | 'USDC' };
export type SavingsGoal = { id: string; name: string; target: string; saved: string };
export type PlanningRecord = { allocations: DashboardAllocation[]; goals: SavingsGoal[] };
type Storage = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<unknown> };
const keyFor = (publicKey: string) => `piggybanq.planning.${publicKey}`;
const money = (value: string, allowZero = false) => parseStellarAmount(value, { decimals: 2, allowZero, maxUnits: 100000000000n });

export function validateAllocation(item: DashboardAllocation) {
  if (!item.id || item.id.length > 100 || !item.name.trim() || item.name.length > 60 || !['PHP', 'USD', 'XLM', 'USDC'].includes(item.currency)) throw new Error('Enter a category and supported currency.');
  money(item.amount);
}
export function validateGoal(item: SavingsGoal) {
  if (!item.id || item.id.length > 100 || !item.name.trim() || item.name.length > 60) throw new Error('Enter a goal name.');
  money(item.target); money(item.saved, true);
}
function validateRecord(record: PlanningRecord) {
  if (!Array.isArray(record.allocations) || !Array.isArray(record.goals) || record.allocations.length > 100 || record.goals.length > 100) throw new Error('At most 100 allocations and 100 goals are supported.');
  record.allocations.forEach(validateAllocation); record.goals.forEach(validateGoal);
  if (new Set(record.allocations.map(item => item.id)).size !== record.allocations.length || new Set(record.goals.map(item => item.id)).size !== record.goals.length) throw new Error('Planning record IDs must be unique.');
}
export async function loadPlanningRecord(storage: Storage, publicKey: string): Promise<PlanningRecord> {
  const value = await storage.getItem(keyFor(publicKey));
  if (!value) return { allocations: [], goals: [] };
  try { const record = JSON.parse(value) as PlanningRecord; validateRecord(record); return record; }
  catch { throw new Error('Saved planning data is damaged. It has been preserved; do not overwrite it.'); }
}
export async function savePlanningRecord(storage: Storage, publicKey: string, record: PlanningRecord) {
  validateRecord(record);
  await storage.setItem(keyFor(publicKey), JSON.stringify(record));
}
