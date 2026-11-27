export type ChatUiChannel = "world" | "profession" | "party" | "circle";

/** circleId：所在的同好会（circle.ts），只有成员收得到、发得出。 */
export function membershipKeys(opts: {
  classId?: string | null;
  partyId?: string | null;
  circleId?: string | null;
}): string[] {
  const keys = ["world"];
  if (opts.classId) keys.push(`profession:${opts.classId}`);
  if (opts.partyId) keys.push(`party:${opts.partyId}`);
  if (opts.circleId) keys.push(`circle:${opts.circleId}`);
  return keys;
}

export function membershipKeyForSend(
  uiChannel: string,
  opts: { classId?: string | null; partyId?: string | null; circleId?: string | null }
): string | null {
  if (uiChannel === "world") return "world";
  if (uiChannel === "profession") {
    return opts.classId ? `profession:${opts.classId}` : null;
  }
  if (uiChannel === "party") {
    return opts.partyId ? `party:${opts.partyId}` : null;
  }
  if (uiChannel === "circle") {
    return opts.circleId ? `circle:${opts.circleId}` : null;
  }
  return null;
}

export function payloadChannel(uiChannel: string): ChatUiChannel {
  if (uiChannel === "profession" || uiChannel === "party" || uiChannel === "circle") return uiChannel;
  return "world";
}

export function addMembership(
  channelMembers: Map<string, Set<string>>,
  connChannels: Set<string>,
  userId: string,
  key: string
) {
  connChannels.add(key);
  const set = channelMembers.get(key) ?? new Set<string>();
  set.add(userId);
  channelMembers.set(key, set);
}
