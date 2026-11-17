let account = "signed-out";
let revision = 0;
export function setAccountScope(email?: string) {
  const next = email?.trim().toLowerCase() || "signed-out";
  if (next !== account) {
    account = next;
    revision++;
  }
}
export function accountRevision() {
  return revision;
}
export function accountStorageKey(base: string) {
  const encoded = Array.from(account)
    .map((c) => c.codePointAt(0)!.toString(16))
    .join("-");
  return `${base}_account_${encoded}`;
}
