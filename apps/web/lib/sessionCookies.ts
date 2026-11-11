export function getSessionCookieNames(baseName: string, cookieNames: string[]): string[] {
  const escapedBaseName = baseName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const chunkPattern = new RegExp(`^${escapedBaseName}_\\d+$`);
  return [baseName, ...cookieNames.filter((name) => chunkPattern.test(name))];
}
