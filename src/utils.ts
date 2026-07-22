// Adds value to current if absent, removes it if present. Used by the waterway/system filter
// checkboxes in AppSidebar.vue and ListView.vue, which each need this same toggle-in-a-list
// behavior for a different filter dimension.
export function toggleInList<T>(current: T[], value: T): T[] {
  const set = new Set(current)
  if (set.has(value)) {
    set.delete(value)
  } else {
    set.add(value)
  }
  return [...set]
}
