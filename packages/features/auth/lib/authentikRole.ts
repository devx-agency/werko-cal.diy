import { Buffer } from "node:buffer";
import { UserPermissionRole } from "@calcom/prisma/enums";

type AuthentikRoleVerificationOptions = {
  issuer: string;
  clientId: string;
  clientSecret: string;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  now?: number;
  fetcher?: typeof fetch;
  onTokensRefreshed: (tokens: {
    accessToken: string;
    refreshToken: string | null;
    expiresAt: number;
  }) => Promise<void>;
};

type OpenIdConfiguration = {
  issuer?: unknown;
  userinfo_endpoint?: unknown;
  token_endpoint?: unknown;
};

type TokenResponse = {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
};

const normalizeIssuer = (issuer: string) => issuer.replace(/\/+$/, "");

export const getAuthentikRoleFromGroups = (groups: unknown): UserPermissionRole => {
  if (!Array.isArray(groups) || !groups.every((group): group is string => typeof group === "string")) {
    return UserPermissionRole.USER;
  }

  return groups.includes("cal-admins") ? UserPermissionRole.ADMIN : UserPermissionRole.USER;
};

export async function verifyAuthentikRole({
  issuer,
  clientId,
  clientSecret,
  accessToken,
  refreshToken,
  expiresAt,
  now = Date.now(),
  fetcher = fetch,
  onTokensRefreshed,
}: AuthentikRoleVerificationOptions): Promise<UserPermissionRole> {
  const normalizedIssuer = normalizeIssuer(issuer);
  const issuerUrl = new URL(`${normalizedIssuer}/`);
  const discoveryUrl = new URL(".well-known/openid-configuration", issuerUrl);
  const discoveryResponse = await fetcher(discoveryUrl, {
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  if (!discoveryResponse.ok) {
    throw new Error(`Authentik discovery failed with status ${discoveryResponse.status}`);
  }

  const configuration = (await discoveryResponse.json()) as OpenIdConfiguration;
  if (
    typeof configuration.issuer !== "string" ||
    normalizeIssuer(configuration.issuer) !== normalizedIssuer ||
    typeof configuration.userinfo_endpoint !== "string" ||
    typeof configuration.token_endpoint !== "string"
  ) {
    throw new Error("Authentik discovery returned invalid role verification configuration");
  }

  const userInfoUrl = new URL(configuration.userinfo_endpoint);
  const tokenUrl = new URL(configuration.token_endpoint);
  if (userInfoUrl.origin !== issuerUrl.origin || tokenUrl.origin !== issuerUrl.origin) {
    throw new Error("Authentik role verification endpoint does not match the configured issuer");
  }

  let currentAccessToken = accessToken;
  let currentRefreshToken = refreshToken;
  let currentExpiresAt = expiresAt;
  let refreshed = false;

  const refreshAccessToken = async () => {
    if (!currentRefreshToken) {
      throw new Error("Authentik access token expired without a refresh token");
    }

    const response = await fetcher(tokenUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: currentRefreshToken,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new Error(`Authentik token refresh failed with status ${response.status}`);
    }

    const tokenResponse = (await response.json()) as TokenResponse;
    if (
      typeof tokenResponse.access_token !== "string" ||
      typeof tokenResponse.expires_in !== "number" ||
      !Number.isFinite(tokenResponse.expires_in) ||
      tokenResponse.expires_in <= 0
    ) {
      throw new Error("Authentik token refresh returned invalid tokens");
    }

    currentAccessToken = tokenResponse.access_token;
    currentRefreshToken =
      typeof tokenResponse.refresh_token === "string" ? tokenResponse.refresh_token : currentRefreshToken;
    currentExpiresAt = Math.floor(now / 1000) + Math.floor(tokenResponse.expires_in);
    refreshed = true;

    await onTokensRefreshed({
      accessToken: currentAccessToken,
      refreshToken: currentRefreshToken,
      expiresAt: currentExpiresAt,
    });
  };

  if (!currentAccessToken) {
    await refreshAccessToken();
  } else if (currentExpiresAt !== null && currentExpiresAt * 1000 <= now + 30_000) {
    await refreshAccessToken();
  }

  const fetchUserInfo = async () =>
    fetcher(userInfoUrl, {
      headers: { Authorization: `Bearer ${currentAccessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

  let userInfoResponse = await fetchUserInfo();
  if (userInfoResponse.status === 401 && currentRefreshToken && !refreshed) {
    await refreshAccessToken();
    userInfoResponse = await fetchUserInfo();
  }

  if (!userInfoResponse.ok) {
    throw new Error(`Authentik UserInfo request failed with status ${userInfoResponse.status}`);
  }

  const userInfo = (await userInfoResponse.json()) as { groups?: unknown };
  return getAuthentikRoleFromGroups(userInfo.groups);
}
