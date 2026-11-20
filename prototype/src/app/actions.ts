"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "./db";

function field(data: FormData, name: string) {
  const value = data.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function id(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !/^[1-9]\d{0,9}$/.test(value)) return 0;
  const number = Number(value);
  return number <= 2147483647 ? number : 0;
}

function cents(amount: string) {
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(amount)) return 0;
  const [dollars, fraction = ""] = amount.split(".");
  return Number(dollars) * 100 + Number(fraction.padEnd(2, "0"));
}

export async function createGroup(_: string, data: FormData) {
  const name = field(data, "name");
  if (!name || name.length > 80) return "Enter a group name of 1 to 80 characters.";
  let groupId: number;
  try {
    const group = await db.group.create({ data: { name } });
    groupId = group.id;
  } catch (error) {
    console.error(error);
    return "Could not create the group. Try again.";
  }
  revalidatePath("/");
  redirect("/?group=" + groupId);
}

export async function addMember(_: string, data: FormData) {
  const name = field(data, "name");
  const groupId = id(data.get("groupId"));
  if (!name || name.length > 80) return "Enter a member name of 1 to 80 characters.";
  try {
    if (!groupId || !(await db.group.findUnique({ where: { id: groupId } }))) {
      return "Select an existing group.";
    }
    await db.member.create({ data: { name, groupId } });
  } catch (error) {
    console.error(error);
    return "Could not add the member. Try again.";
  }
  revalidatePath("/");
  return "";
}

export async function recordExpense(_: string, data: FormData) {
  const groupId = id(data.get("groupId"));
  const payerId = id(data.get("payerId"));
  const participants = data.getAll("participantId").map(id);
  const description = field(data, "description");
  const amountCents = cents(field(data, "amount"));
  if (!description || description.length > 160) {
    return "Enter a description of 1 to 160 characters.";
  }
  if (!amountCents || amountCents > 2147483647) {
    return "Enter an amount from $0.01 to $21,474,836.47 with up to two decimal places.";
  }
  if (!participants.length) return "Select at least one participant.";

  const memberIds = [...new Set(participants)].sort((a, b) => a - b);
  if (!groupId || !payerId || memberIds.includes(0) || memberIds.length !== participants.length) {
    return "Choose a payer and distinct participants from this group.";
  }

  try {
    const valid = await db.$transaction(async (tx) => {
      const requiredIds = [...new Set([payerId, ...memberIds])];
      const count = await tx.member.count({ where: { groupId, id: { in: requiredIds } } });
      if (count !== requiredIds.length) return false;

      const base = Math.floor(amountCents / memberIds.length);
      const remainder = amountCents % memberIds.length;
      await tx.expense.create({
        data: {
          groupId,
          payerId,
          description,
          amountCents,
          shares: {
            create: memberIds.map((memberId, index) => ({
              memberId,
              amountCents: base + (index < remainder ? 1 : 0),
            })),
          },
        },
      });
      return true;
    });
    if (!valid) return "Choose a payer and participants from this group.";
  } catch (error) {
    console.error(error);
    return "Could not record the expense. Try again.";
  }
  revalidatePath("/");
  return "";
}
