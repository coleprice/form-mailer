export function isHoneypotTriggered(value: string | undefined, enabled: boolean): boolean {
  if (!enabled) {
    return false;
  }

  return Boolean(value && value.trim() !== "");
}

