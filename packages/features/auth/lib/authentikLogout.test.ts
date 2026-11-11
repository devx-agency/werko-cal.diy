import { describe, expect, it, vi } from "vitest";
import { getAuthentikLogoutUrl, getSafePostLogoutRedirectUri } from "./authentikLogout";

describe("getAuthentikLogoutUrl", () => {
  it("uses the logout endpoint advertised by matching issuer metadata", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          issuer: "https://auth.example/application/o/cal/",
          end_session_endpoint: "https://auth.example/application/o/cal/end-session/",
        }),
        { status: 200 }
      )
    );

    const logoutUrl = new URL(
      await getAuthentikLogoutUrl({
        issuer: "https://auth.example/application/o/cal/",
        clientId: "cal-client",
        idToken: "private-id-token",
        postLogoutRedirectUri: "https://cal.example/auth/login",
        fetcher,
      })
    );

    expect(fetcher).toHaveBeenCalledWith(
      new URL("https://auth.example/application/o/cal/.well-known/openid-configuration"),
      { cache: "no-store" }
    );
    expect(logoutUrl.searchParams.get("client_id")).toBe("cal-client");
    expect(logoutUrl.searchParams.get("id_token_hint")).toBe("private-id-token");
    expect(logoutUrl.searchParams.get("post_logout_redirect_uri")).toBe("https://cal.example/auth/login");
  });

  it("rejects logout metadata for a different issuer", async () => {
    await expect(
      getAuthentikLogoutUrl({
        issuer: "https://auth.example/application/o/cal/",
        clientId: "cal-client",
        idToken: "private-id-token",
        postLogoutRedirectUri: "https://cal.example/auth/logout",
        fetcher: vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              issuer: "https://attacker.example",
              end_session_endpoint: "https://attacker.example/logout",
            }),
            { status: 200 }
          )
        ),
      })
    ).rejects.toThrow("invalid logout configuration");
  });

  it("rejects logout endpoints on another origin", async () => {
    await expect(
      getAuthentikLogoutUrl({
        issuer: "https://auth.example/application/o/cal/",
        clientId: "cal-client",
        idToken: "private-id-token",
        postLogoutRedirectUri: "https://cal.example/auth/logout",
        fetcher: vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              issuer: "https://auth.example/application/o/cal/",
              end_session_endpoint: "https://attacker.example/logout",
            }),
            { status: 200 }
          )
        ),
      })
    ).rejects.toThrow("does not match the configured issuer");
  });
});

describe("getSafePostLogoutRedirectUri", () => {
  it("defaults to the login page", () => {
    expect(getSafePostLogoutRedirectUri(undefined, "https://cal.example").toString()).toBe(
      "https://cal.example/auth/login"
    );
  });

  it("allows relative and same-origin callback URLs", () => {
    expect(getSafePostLogoutRedirectUri("/signup", "https://cal.example").toString()).toBe(
      "https://cal.example/signup"
    );
    expect(
      getSafePostLogoutRedirectUri(
        "https://cal.example/auth/logout?survey=true",
        "https://cal.example"
      ).toString()
    ).toBe("https://cal.example/auth/logout?survey=true");
  });

  it("falls back to the login page for external or malformed callback URLs", () => {
    expect(getSafePostLogoutRedirectUri("//attacker.example", "https://cal.example").toString()).toBe(
      "https://cal.example/auth/login"
    );
    expect(getSafePostLogoutRedirectUri("http://[", "https://cal.example").toString()).toBe(
      "https://cal.example/auth/login"
    );
  });
});
