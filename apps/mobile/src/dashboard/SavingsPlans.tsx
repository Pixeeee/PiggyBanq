import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useMobileTheme } from '../theme';
import { Body, Button, Card, Field, Heading, Icon, IconButton, ProgressBar, Segments, Sheet } from '../ui/banking';
import { PiggyCompanion } from './PiggyCompanion';
import { getGoalProgress } from './presentation';
import { validateAllocation, validateGoal, type DashboardAllocation, type PlanningRecord, type SavingsGoal } from './planning';

type Editor = { kind: 'goal' | 'allocation' | 'progress'; id?: string };
const blank = { name: '', amount: '', currency: 'PHP' as DashboardAllocation['currency'], saved: '0.00' };
export function SavingsPlans({ record, loaded, busy, message, celebration, onSave }: { record: PlanningRecord; loaded: boolean; busy: boolean; message: string; celebration: number; onSave: (next: PlanningRecord) => Promise<boolean> }) {
  const { palette } = useMobileTheme();
  const [section, setSection] = useState('Goals');
  const [editor, setEditor] = useState<Editor | null>(null);
  const [draft, setDraft] = useState(blank);
  const [error, setError] = useState('');
  function open(kind: Editor['kind'], item?: SavingsGoal | DashboardAllocation) {
    if (busy) return;
    setError(''); setEditor({ kind, id: item?.id });
    setDraft(item ? { name: item.name, amount: 'target' in item ? item.target : item.amount, currency: 'currency' in item ? item.currency : 'PHP', saved: 'saved' in item ? item.saved : '0.00' } : blank);
  }
  async function save() {
    if (!editor || busy) return;
    try {
      let next: PlanningRecord;
      if (editor.kind === 'allocation') {
        const item = { id: editor.id ?? `allocation-${Date.now()}`, name: draft.name.trim(), amount: draft.amount.trim(), currency: draft.currency };
        validateAllocation(item);
        next = { ...record, allocations: editor.id ? record.allocations.map(old => old.id === editor.id ? item : old) : [...record.allocations, item] };
      } else {
        const item = { id: editor.id ?? `goal-${Date.now()}`, name: draft.name.trim(), target: draft.amount.trim(), saved: draft.saved.trim() };
        validateGoal(item);
        next = { ...record, goals: editor.id ? record.goals.map(old => old.id === editor.id ? item : old) : [...record.goals, item] };
      }
      if (await onSave(next)) setEditor(null);
      else setError('The plan could not be saved. Your draft is still here. Check the status and try again.');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Check the values and try again.'); }
  }
  function remove(kind: 'goal' | 'allocation', id: string, name: string) {
    Alert.alert(`Delete ${name}?`, 'This removes a local planning record. No wallet funds are moved.', [
      { text: 'Keep plan', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { void onSave(kind === 'goal' ? { ...record, goals: record.goals.filter(item => item.id !== id) } : { ...record, allocations: record.allocations.filter(item => item.id !== id) }); } }
    ]);
  }
  function move(id: string, direction: -1 | 1) {
    if (busy) return;
    const index = record.allocations.findIndex(item => item.id === id); const destination = index + direction;
    if (index < 0 || destination < 0 || destination >= record.allocations.length) return;
    const items = [...record.allocations]; const [item] = items.splice(index, 1); items.splice(destination, 0, item);
    void onSave({ ...record, allocations: items });
  }
  const title = editor?.kind === 'progress' ? 'Update savings progress' : editor?.kind === 'allocation' ? editor.id ? 'Edit allocation' : 'New allocation' : editor?.id ? 'Edit goal' : 'New savings goal';
  return <>
    <Heading title="Save a little. Dream big." subtitle="Your goals and budgets, all in one place." />
    <Segments items={['Goals', 'Budget']} active={section} onSelect={setSection} />
    <PiggyCompanion celebration={celebration} compact />
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><View style={{ flex: 1 }}><Text style={{ color: palette.textDark, fontSize: 19, fontWeight: '700' }}>{section === 'Goals' ? 'Savings goals' : 'Budget allocations'}</Text><Text style={{ color: palette.textSoft, fontSize: 12, marginTop: 5 }}>Local plans · No funds moved</Text></View><IconButton label={section === 'Goals' ? 'Add savings goal' : 'Add allocation'} icon="add" onPress={() => { if (loaded && !busy) open(section === 'Goals' ? 'goal' : 'allocation'); }} /></View>
    {!loaded ? <Card><Body>{message}</Body></Card> : section === 'Goals' ? <>
      {!record.goals.length ? <Card><Icon name="flag-outline" color={palette.rose} size={32} /><Text style={{ color: palette.textDark, fontSize: 19, fontWeight: '700' }}>What are you saving for?</Text><Body>A rainy-day fund, a trip, or your next big thing. Start with one goal.</Body><Button label="Create your first goal" icon="add" onPress={() => open('goal')} disabled={busy} /></Card> : record.goals.map(goal => <GoalCard key={goal.id} goal={goal} onProgress={() => open('progress', goal)} onEdit={() => open('goal', goal)} onDelete={() => remove('goal', goal.id, goal.name)} />)}
    </> : <>
      {!record.allocations.length ? <Card><Icon name="pie-chart-outline" color={palette.rose} size={32} /><Text style={{ color: palette.textDark, fontSize: 19, fontWeight: '700' }}>Make room for what matters</Text><Body>Plan categories in the currency you use. These amounts are separate from your wallet balance.</Body><Button label="Create allocation" icon="add" onPress={() => open('allocation')} disabled={busy} /></Card> : record.allocations.map((item, index) => <Card key={item.id} style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: palette.cardAlt, alignItems: 'center', justifyContent: 'center' }}><Icon name="pie-chart-outline" color={palette.rose} /></View><View style={{ flex: 1, gap: 4 }}><Text style={{ color: palette.textDark, fontSize: 16, fontWeight: '600' }}>{item.name}</Text><Text style={{ color: palette.textMid, fontSize: 15 }}>{item.currency} {item.amount}</Text></View><IconButton label={`Edit ${item.name} allocation`} icon="create-outline" onPress={() => open('allocation', item)} /><IconButton label={`Delete ${item.name} allocation`} icon="trash-outline" onPress={() => remove('allocation', item.id, item.name)} /></View>
        <View style={{ flexDirection: 'row', gap: 12 }}><OrderButton label="Move up" disabled={busy || index === 0} onPress={() => move(item.id, -1)} /><OrderButton label="Move down" disabled={busy || index === record.allocations.length - 1} onPress={() => move(item.id, 1)} /></View>
      </Card>)}
    </>}
    <Text accessibilityLiveRegion="polite" style={{ color: palette.textMid, fontSize: 12, lineHeight: 18 }}>{message}</Text>
    <Sheet visible={Boolean(editor)} title={title} onClose={() => { if (!busy) setEditor(null); }}>
      <Body>{editor?.kind === 'progress' ? 'Record the amount you have saved toward this plan. This does not transfer wallet funds.' : 'Give this local plan a name and an amount. You can adjust it anytime.'}</Body>
      {editor?.kind !== 'progress' ? <Field editable={!busy} label={editor?.kind === 'allocation' ? 'Category name' : 'Goal name'} value={draft.name} onChangeText={name => setDraft({ ...draft, name })} placeholder="e.g. Emergency fund" maxLength={60} autoCapitalize="sentences" /> : <Text style={{ color: palette.textDark, fontSize: 18, fontWeight: '700' }}>{draft.name}</Text>}
      <Field editable={!busy} label={editor?.kind === 'progress' ? 'Saved amount PHP' : editor?.kind === 'allocation' ? 'Allocation amount' : 'Goal target PHP'} value={editor?.kind === 'progress' ? draft.saved : draft.amount} onChangeText={value => setDraft({ ...draft, [editor?.kind === 'progress' ? 'saved' : 'amount']: value })} placeholder="0.00" keyboardType="decimal-pad" />
      {editor?.kind === 'allocation' ? <Segments disabled={busy} items={['PHP', 'USD', 'XLM', 'USDC']} active={draft.currency} onSelect={currency => setDraft({ ...draft, currency: currency as DashboardAllocation['currency'] })} /> : null}
      {error ? <Text accessibilityLiveRegion="polite" style={{ color: palette.rose, fontSize: 14, lineHeight: 20 }}>{error}</Text> : null}
      <Button label={busy ? 'Saving...' : editor?.kind === 'allocation' && !editor.id ? 'Create allocation' : editor?.kind === 'progress' ? 'Save progress' : 'Save plan'} onPress={() => { void save(); }} disabled={busy} />
    </Sheet>
  </>;
}
export function GoalCard({ goal, onProgress, onEdit, onDelete }: { goal: SavingsGoal; onProgress: () => void; onEdit?: () => void; onDelete?: () => void }) {
  const { palette } = useMobileTheme(); const progress = getGoalProgress(goal);
  return <Card style={{ gap: 14 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><View style={{ backgroundColor: palette.surfaceStrong, borderRadius: 16, height: 46, width: 46, alignItems: 'center', justifyContent: 'center' }}><Icon name={/trip|travel|holiday/i.test(goal.name) ? 'airplane-outline' : 'flag-outline'} color={palette.rose} /></View><View style={{ flex: 1, gap: 4 }}><Text style={{ color: palette.textDark, fontSize: 16, fontWeight: '700' }}>{goal.name}</Text><Text style={{ color: palette.textSoft, fontSize: 12 }}>{progress.percent >= 100 ? 'You reached your target!' : `PHP ${progress.remaining} to go`}</Text></View>{onEdit ? <IconButton label={`Edit goal ${goal.name}`} icon="create-outline" onPress={onEdit} /> : null}</View>
    <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' }}><Text style={{ color: palette.textDark, fontSize: 18, fontWeight: '700' }}>PHP {goal.saved}<Text style={{ color: palette.textSoft, fontSize: 12, fontWeight: '400' }}> / {goal.target}</Text></Text><Text style={{ color: palette.rose, fontSize: 13, fontWeight: '700' }}>{Math.floor(progress.percent)}%</Text></View>
    <ProgressBar percent={progress.percent} />
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><View style={{ flex: 1 }}><Button label="Update progress" secondary onPress={onProgress} /></View>{onDelete ? <IconButton label={`Delete goal ${goal.name}`} icon="trash-outline" onPress={onDelete} /> : null}</View>
  </Card>;
}
function OrderButton({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
  const { palette } = useMobileTheme();
  return <Pressable accessibilityRole="button" disabled={disabled} accessibilityState={{ disabled }} onPress={onPress} style={{ flex: 1, minHeight: 44, justifyContent: 'center', alignItems: 'center', opacity: disabled ? 0.35 : 1 }}><Text style={{ color: palette.textMid, fontSize: 12 }}>{label}</Text></Pressable>;
}
