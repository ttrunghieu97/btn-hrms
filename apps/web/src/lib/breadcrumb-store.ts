let title = '';
const listeners = new Set<() => void>();

export function setBreadcrumbRoleName(name: string) {
  if (name !== title) {
    title = name;
    listeners.forEach(l => l());
  }
}

export function getBreadcrumbRoleName() {
  return title;
}

export function subscribeBreadcrumbRoleName(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
