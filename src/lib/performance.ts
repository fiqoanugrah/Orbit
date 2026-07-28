export const activityListLimit = 30;
export const formOptionLimit = 200;
export const pageListLimit = 50;

export function normalizeSearchParam(value: string | undefined) {
  const query = String(value ?? "").trim();
  return query.length >= 2 ? query.slice(0, 80) : "";
}
