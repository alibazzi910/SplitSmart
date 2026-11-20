import Link from "next/link";
import { db } from "./db";
import { ExpenseForm, GroupForm, MemberForm } from "./forms";

export const dynamic = "force-dynamic";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const signedMoney = new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", signDisplay: "exceptZero",
});

export default async function Home({ searchParams }: {
  searchParams: Promise<{ group?: string | string[] }>;
}) {
  const { group } = await searchParams;
  const groups = await db.group.findMany({ orderBy: { id: "desc" } });
  const selection = group === undefined ? groups[0] : groups.find(({ id }) => String(id) === group);
  const selected = selection && await db.group.findUnique({
    where: { id: selection.id },
    include: {
      members: { orderBy: { id: "asc" } },
      expenses: {
        orderBy: { id: "desc" },
        include: { payer: true, shares: { orderBy: { memberId: "asc" }, include: { member: true } } },
      },
    },
  });

  const balances = new Map(selected?.members.map(({ id }) => [id, 0]));
  for (const expense of selected?.expenses ?? []) {
    balances.set(expense.payerId, (balances.get(expense.payerId) ?? 0) + expense.amountCents);
    for (const share of expense.shares) {
      balances.set(share.memberId, (balances.get(share.memberId) ?? 0) - share.amountCents);
    }
  }

  return (
    <>
      <header className="border-b border-teal-950/10 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-5 text-xl font-bold tracking-tight text-teal-950">SplitSmart</div>
      </header>
      <main className="mx-auto grid max-w-6xl items-start gap-6 px-5 py-8 md:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="panel space-y-5">
          <h2>Groups</h2>
          {groups.length ? (
            <nav aria-label="Groups" className="grid gap-1">
              {groups.map(({ id, name }) => (
                <Link key={id} href={"/?group=" + id}
                  aria-current={selected?.id === id ? "page" : undefined}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-teal-950 hover:bg-teal-50 aria-[current=page]:bg-teal-100">
                  {name}
                </Link>
              ))}
            </nav>
          ) : <p className="muted">No groups yet.</p>}
          <GroupForm />
        </aside>
        {selected ? (
          <div key={selected.id} className="min-w-0 space-y-6">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{selected.name}</h1>
            <section className="panel space-y-4">
              <h2>Members &amp; balances</h2>
              {selected.members.length ? (
                <>
                  <p className="muted">Positive balances are amounts to receive. Negative balances are amounts owed.</p>
                  <ul className="divide-y divide-slate-100">
                    {selected.members.map((member) => {
                      const balance = balances.get(member.id) ?? 0;
                      return (
                        <li key={member.id} className="flex items-start justify-between gap-4 py-2">
                          <span>{member.name}</span>
                          <span className={balance > 0 ? "text-teal-800" : balance < 0 ? "text-red-800" : "text-slate-600"}>
                            {signedMoney.format(balance / 100)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : <p className="muted">No members yet. Add someone to start splitting expenses.</p>}
              <MemberForm groupId={selected.id} />
            </section>
            <section className="panel space-y-4">
              <h2>New expense</h2>
              {selected.members.length
                ? <ExpenseForm groupId={selected.id} members={selected.members} />
                : <p className="muted">Add a member before recording an expense.</p>}
            </section>
            <section className="panel space-y-4">
              <h2>Expense history</h2>
              {selected.expenses.length ? (
                <ul className="divide-y divide-slate-100">
                  {selected.expenses.map((expense) => (
                    <li key={expense.id} className="space-y-1 py-4 first:pt-0 last:pb-0">
                      <div className="flex justify-between gap-4 font-semibold">
                        <span>{expense.description}</span>
                        <span>{money.format(expense.amountCents / 100)}</span>
                      </div>
                      <p className="muted">Paid by {expense.payer.name}</p>
                      <ul aria-label="Participant shares" className="flex flex-wrap gap-2 text-xs">
                        {expense.shares.map(({ member, amountCents }) => (
                          <li key={member.id} className="rounded-md bg-slate-100 px-2 py-1">
                            {member.name} · {money.format(amountCents / 100)}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              ) : <p className="muted">No expenses recorded yet.</p>}
            </section>
          </div>
        ) : (
          <section className="panel space-y-2">
            <h1 className="text-2xl font-bold">{groups.length ? "Group unavailable" : "Create your first group"}</h1>
            <p className="muted">{groups.length ? "Select a group from the list." : "Start with a group for your trip, household, or event."}</p>
          </section>
        )}
      </main>
    </>
  );
}
