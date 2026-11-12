export function signOutFromCal(callbackUrl: string = "/"): void {
  window.location.assign(`/api/authentik-logout?callbackUrl=${encodeURIComponent(callbackUrl)}`);
}
