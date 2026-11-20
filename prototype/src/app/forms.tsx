"use client";

import { useActionState } from "react";
import { addMember, createGroup, recordExpense } from "./actions";

type Action = (previous: string, data: FormData) => Promise<string>;

function EntryForm({ action, label, children }: {
  action: Action;
  label: string;
  children: React.ReactNode;
}) {
  const [error, submit, pending] = useActionState(action, "");

  return (
    <form action={submit} className="space-y-4">
      <fieldset disabled={pending} className="min-w-0 space-y-4">
        {children}
        <button type="submit">{pending ? "Saving…" : label}</button>
      </fieldset>
      {error && <p role="alert" className="text-sm font-medium text-red-800">{error}</p>}
    </form>
  );
}

export function GroupForm() {
  return (
    <EntryForm action={createGroup} label="Create group">
      <label>Group name<input name="name" maxLength={80} required placeholder="e.g. Weekend trip" /></label>
    </EntryForm>
  );
}

export function MemberForm({ groupId }: { groupId: number }) {
  return (
    <EntryForm action={addMember} label="Add member">
      <input type="hidden" name="groupId" value={groupId} />
      <label>Member name<input name="name" maxLength={80} required placeholder="e.g. Alice" /></label>
    </EntryForm>
  );
}

export function ExpenseForm({ groupId, members }: {
  groupId: number;
  members: { id: number; name: string }[];
}) {
  return (
    <EntryForm action={recordExpense} label="Record expense">
      <input type="hidden" name="groupId" value={groupId} />
      <label>Description<input name="description" maxLength={160} required placeholder="e.g. Dinner" /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label>Amount (USD)<input name="amount" inputMode="decimal" required placeholder="0.00" /></label>
        <label>Paid by
          <select name="payerId" defaultValue="" required>
            <option value="" disabled>Select a member</option>
            {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
          </select>
        </label>
      </div>
      <fieldset className="min-w-0">
        <legend className="mb-2 text-sm font-semibold">Split between</legend>
        <div className="flex flex-wrap gap-2">
          {members.map((member) => (
            <label key={member.id} className="participant">
              <input type="checkbox" name="participantId" value={member.id} />{member.name}
            </label>
          ))}
        </div>
      </fieldset>
    </EntryForm>
  );
}
