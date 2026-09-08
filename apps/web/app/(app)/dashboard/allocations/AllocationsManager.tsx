'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  createBudgetAllocation,
  deleteBudgetAllocation,
  getBudgetPlans,
  reorderBudgetAllocations,
  updateBudgetAllocation,
  type BudgetPlan
} from '../../../lib/wallet-auth-api';
import { minorToDecimal } from '../_components/MoneyFormat';

type Currency = 'PHP' | 'USD' | 'XLM' | 'USDC';

type AllocationRow = BudgetPlan['categories'][number] & {
  month: string;
  planId: string;
};

type AllocationDraft = {
  amount: string;
  category: string;
  currency: Currency;
};

const emptyDraft: AllocationDraft = { amount: '', category: 'Food', currency: 'PHP' };

export function AllocationsManager() {
  const [plans, setPlans] = useState<BudgetPlan[]>([]);
  const [draft, setDraft] = useState<AllocationDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<AllocationDraft>(emptyDraft);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [status, setStatus] = useState('Loading allocations...');

  useEffect(() => {
    void refreshPlans();
  }, []);

  const rows = useMemo(
    () =>
      plans.flatMap((plan) =>
        plan.categories.map((item) => ({
          ...item,
          month: plan.month,
          planId: plan.id
        }))
      ),
    [plans]
  );

  async function refreshPlans() {
    try {
      const result = await getBudgetPlans();
      setPlans(result.plans);
      setStatus(result.plans.length ? 'Allocations synced.' : 'No allocations yet. Create your first budget card.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to load allocations.');
    }
  }

  async function addAllocation() {
    setStatus('Saving allocation...');
    try {
      const result = await createBudgetAllocation(draft);
      replacePlan(result.plan);
      setDraft(emptyDraft);
      setStatus('Allocation saved.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to save allocation.');
    }
  }

  function startEditing(row: AllocationRow) {
    setEditingId(row.id);
    setEditDraft({
      amount: minorToDecimal(row.amountMinor),
      category: row.name,
      currency: row.currency as Currency
    });
  }

  async function saveEditing(row: AllocationRow) {
    setStatus('Updating allocation...');
    try {
      const result = await updateBudgetAllocation(row.id, editDraft);
      replacePlan(result.plan);
      setEditingId(null);
      setStatus('Allocation updated.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to update allocation.');
    }
  }

  async function removeAllocation(row: AllocationRow) {
    setStatus('Deleting allocation...');
    try {
      const result = await deleteBudgetAllocation(row.id);
      replacePlan(result.plan);
      setEditingId((current) => (current === row.id ? null : current));
      setStatus('Allocation deleted.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to delete allocation.');
    }
  }

  async function moveAllocation(row: AllocationRow, direction: -1 | 1) {
    const plan = plans.find((item) => item.id === row.planId);

    if (!plan) {
      return;
    }

    const currentIndex = plan.categories.findIndex((category) => category.id === row.id);
    const nextIndex = currentIndex + direction;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= plan.categories.length) {
      return;
    }

    const nextIds = plan.categories.map((category) => category.id);
    const [movedId] = nextIds.splice(currentIndex, 1);
    nextIds.splice(nextIndex, 0, movedId);
    await persistOrder(row.planId, nextIds);
  }

  async function dropAllocation(targetRow: AllocationRow) {
    if (!draggedId || draggedId === targetRow.id) {
      setDraggedId(null);
      return;
    }

    const plan = plans.find((item) => item.id === targetRow.planId);

    if (!plan || !plan.categories.some((category) => category.id === draggedId)) {
      setDraggedId(null);
      return;
    }

    const nextIds = plan.categories.map((category) => category.id);
    const fromIndex = nextIds.indexOf(draggedId);
    const toIndex = nextIds.indexOf(targetRow.id);

    if (fromIndex < 0 || toIndex < 0) {
      setDraggedId(null);
      return;
    }

    const [movedId] = nextIds.splice(fromIndex, 1);
    nextIds.splice(toIndex, 0, movedId);
    setDraggedId(null);
    await persistOrder(targetRow.planId, nextIds);
  }

  async function persistOrder(planId: string, orderedCategoryIds: string[]) {
    setStatus('Saving allocation order...');
    try {
      const result = await reorderBudgetAllocations(planId, orderedCategoryIds);
      replacePlan(result.plan);
      setStatus('Allocation order saved.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to reorder allocations.');
    }
  }

  function replacePlan(nextPlan: BudgetPlan) {
    setPlans((current) => [nextPlan, ...current.filter((plan) => plan.id !== nextPlan.id)]);
  }

  return (
    <article className="live-manager-card allocation-board-card">
      <div className="live-manager-heading">
        <div>
          <span>Editable allocation board</span>
          <strong>Build reserves that stay clear across every rail</strong>
        </div>
        <em>{status}</em>
      </div>

      <form className="manager-form allocation-create-form">
        <AllocationFields draft={draft} onChange={setDraft} />
        <button type="button" onClick={addAllocation}>Create allocation</button>
      </form>

      <div className="allocation-board" aria-label="Editable saved allocations">
        {rows.length ? rows.map((row, index) => {
          const isEditing = editingId === row.id;
          const planRows = rows.filter((item) => item.planId === row.planId);

          return (
            <article
              aria-label={`${row.name} allocation card`}
              className={`allocation-edit-card${draggedId === row.id ? ' is-dragging' : ''}`}
              draggable={!isEditing}
              key={row.id}
              onDragOver={(event) => event.preventDefault()}
              onDragStart={() => setDraggedId(row.id)}
              onDrop={() => void dropAllocation(row)}
            >
              <div className="allocation-card-topline">
                <button
                  aria-label={`Drag ${row.name}`}
                  className="allocation-drag-handle"
                  disabled={isEditing}
                  type="button"
                >
                  ::
                </button>
                <small>{row.month}</small>
              </div>

              {isEditing ? (
                <div className="allocation-edit-fields">
                  <AllocationFields draft={editDraft} onChange={setEditDraft} />
                </div>
              ) : (
                <div className="allocation-card-read">
                  <strong>{row.name}</strong>
                  <span>{row.currency} {minorToDecimal(row.amountMinor)}</span>
                </div>
              )}

              <div className="allocation-card-actions">
                <button type="button" onClick={() => void moveAllocation(row, -1)} disabled={planRows[0]?.id === row.id}>Move up</button>
                <button type="button" onClick={() => void moveAllocation(row, 1)} disabled={planRows[planRows.length - 1]?.id === row.id}>Move down</button>
                {isEditing ? (
                  <>
                    <button type="button" onClick={() => void saveEditing(row)}>Save</button>
                    <button type="button" onClick={() => setEditingId(null)}>Cancel</button>
                  </>
                ) : (
                  <button type="button" onClick={() => startEditing(row)}>Edit</button>
                )}
                <button type="button" onClick={() => void removeAllocation(row)}>Delete</button>
              </div>

              <small className="allocation-order-label">Position {index + 1}</small>
            </article>
          );
        }) : (
          <div className="dashboard-empty-state allocation-empty-state">
            <strong>No editable allocations yet.</strong>
            <small>Create a budget card, then reorder it with drag/drop or move controls.</small>
          </div>
        )}
      </div>
    </article>
  );
}

function AllocationFields({
  draft,
  onChange
}: {
  draft: AllocationDraft;
  onChange: (draft: AllocationDraft) => void;
}) {
  return (
    <>
      <label>Type<input value={draft.category} onChange={(event) => onChange({ ...draft, category: event.target.value })} /></label>
      <label>Amount<input value={draft.amount} onChange={(event) => onChange({ ...draft, amount: event.target.value })} placeholder="1500.00" /></label>
      <label>
        Asset
        <select value={draft.currency} onChange={(event) => onChange({ ...draft, currency: event.target.value as Currency })}>
          <option value="PHP">PHP</option>
          <option value="USD">USD</option>
          <option value="XLM">XLM</option>
          <option value="USDC">USDC</option>
        </select>
      </label>
    </>
  );
}
