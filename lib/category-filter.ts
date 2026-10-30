import { categories } from "./expense-options";

type CategoryOption = { _id: string; kind: string; name: string; legacyType?: string };
const legacyKey = (option: CategoryOption) => option.legacyType ?? (categories.includes(option.name.trim().toLowerCase()) ? option.name.trim().toLowerCase() : undefined);

/** One visible category includes its imported key and personal category IDs. */
export function categoryFilterChoices(options: CategoryOption[]) {
  const personal = options.filter((option) => option.kind === "category");
  const groups = new Map<string, { value: string; label: string }>();
  for (const option of personal) {
    const key = legacyKey(option) ?? `custom:${option._id}`;
    if (!groups.has(key)) groups.set(key, { value: legacyKey(option) ?? `custom:${option._id}`, label: option.name });
  }
  for (const type of categories) {
    if (!groups.has(type)) groups.set(type, { value: type, label: type.charAt(0).toUpperCase() + type.slice(1) });
  }
  return [{ value: "", label: "All categories" }, ...Array.from(groups.values()).sort((a, b) => a.label.localeCompare(b.label))];
}

export function categoryFilterTypes(category: string, options: CategoryOption[]): string[] {
  const personal = options.filter((option) => option.kind === "category");
  const selected = personal.find((option) => `custom:${option._id}` === category);
  const legacy = selected ? legacyKey(selected) : categories.includes(category) ? category : undefined;
  return Array.from(new Set([category, ...(legacy ? [legacy, ...personal.filter((option) => legacyKey(option) === legacy).map((option) => `custom:${option._id}`)] : [])]));
}
