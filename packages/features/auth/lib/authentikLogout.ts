type AuthentikLogoutUrlOptions = {
  issuer: string;
  clientId: string;
  idToken: string;
  postLogoutRedirectUri: string;
  fetcher?: typeof fetch;
};

type OpenIdConfiguration = {
  issuer?: unknown;
  end_session_endpoint?: unknown;
};

const normalizeIssuer = (issuer: string): string => issuer.replace(/\/+$/, "");

export async function getAuthentikLogoutUrl({
  issuer,
  clientId,
  idToken,
  postLogoutRedirectUri,
  fetcher = fetch,
}: AuthentikLogoutUrlOptions): Promise<string> {
  const normalizedIssuer = normalizeIssuer(issuer);
  const issuerUrl = new URL(`${normalizedIssuer}/`);
  const discoveryUrl = new URL(".well-known/openid-configuration", issuerUrl);
  const response = await fetcher(discoveryUrl, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Authentik discovery failed with status ${response.status}`);
  }

  const configuration = (await response.json()) as OpenIdConfiguration;
  if (
    typeof configuration.issuer !== "string" ||
    normalizeIssuer(configuration.issuer) !== normalizedIssuer ||
    typeof configuration.end_session_endpoint !== "string"
  ) {
    throw new Error("Authentik discovery returned an invalid logout configuration");
  }

  const endSessionUrl = new URL(configuration.end_session_endpoint);
  if (endSessionUrl.origin !== issuerUrl.origin) {
    throw new Error("Authentik logout endpoint does not match the configured issuer");
  }

  endSessionUrl.searchParams.set("client_id", clientId);
  endSessionUrl.searchParams.set("id_token_hint", idToken);
  endSessionUrl.searchParams.set("post_logout_redirect_uri", postLogoutRedirectUri);

  return endSessionUrl.toString();
}

export function getSafePostLogoutRedirectUri(callbackUrl: string | undefined, appUrl: string): URL {
  const appOrigin = new URL(appUrl);
  const fallback = new URL("/auth/login", appOrigin);

  if (!callbackUrl) return fallback;

  try {
    const redirectUrl = new URL(callbackUrl, appOrigin);
    if (redirectUrl.origin !== appOrigin.origin || redirectUrl.username || redirectUrl.password) {
      return fallback;
    }

    return redirectUrl;
  } catch {
    return fallback;
  }
}
