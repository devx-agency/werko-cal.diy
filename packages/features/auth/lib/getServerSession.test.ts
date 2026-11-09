import type { NextApiRequest } from "next";
import type { RequestMethod } from "node-mocks-http";
import { createMocks } from "node-mocks-http";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Use vi.hoisted to import mocks before vi.mock hoisting
const {
  prismaMock,
  resetPrismaMock,
  createLoggerMock,
  createPrismaMock,
  createUserRepositoryMock,
  createAvatarUrlMock,
  createSafeStringifyMock,
  createGetTokenMock,
  createMockUser,
  createMockToken,
}: typeof import("../__mocks__/getServerSession.mocks") = await vi.hoisted(
  async () => await import("../__mocks__/getServerSession.mocks")
);

vi.mock("@calcom/lib/logger", createLoggerMock);
vi.mock("@calcom/prisma", createPrismaMock);
vi.mock("@calcom/features/users/repositories/UserRepository", createUserRepositoryMock);
vi.mock("@calcom/lib/getAvatarUrl", createAvatarUrlMock);
vi.mock("@calcom/lib/safeStringify", createSafeStringifyMock);
vi.mock("next-auth/jwt", createGetTokenMock);

import { getToken } from "next-auth/jwt";
import { getServerSession } from "./getServerSession";

type MockNextApiRequest = ReturnType<typeof createMocks<NextApiRequest>>["req"];

function createMockRequest(method: RequestMethod = "GET"): MockNextApiRequest {
  const { req } = createMocks<NextApiRequest>({ method });
  return req;
}

function setupGetTokenMock(tokenData: object | null): void {
  vi.mocked(getToken).mockResolvedValue(tokenData as Record<string, unknown> | null);
}

describe("getServerSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetPrismaMock();
  });

  describe("Token Validation", () => {
    it.each([
      ["no token", null],
      ["no email", { sub: "5" }],
      ["no sub", { email: "user@example.com" }],
    ])("returns null when token is invalid: %s", async (_, token) => {
      setupGetTokenMock(token);

      const result = await getServerSession({ req: createMockRequest() });
      expect(result).toBeNull();
    });
  });

  describe("User ID Validation", () => {
    it.each(["", "invalid", "0", "-1"])("returns null when token.sub is invalid (%s)", async (sub) => {
      setupGetTokenMock(createMockToken({ sub }));

      const result = await getServerSession({ req: createMockRequest() });

      expect(result).toBeNull();
      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("User Lookup", () => {
    it("looks up user by ID from token.sub", async () => {
      const mockUser = createMockUser({ id: 123 });
      setupGetTokenMock(createMockToken({ sub: "123" }));
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      await getServerSession({ req: createMockRequest() });

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: 123 },
      });
    });

    it("rechecks Authentik groups after 15 minutes before returning the session role", async () => {
      vi.useFakeTimers();
      const now = new Date("2026-11-04T12:00:00.000Z");
      vi.setSystemTime(now);
      vi.stubEnv("AUTHENTIK_CLIENT_ID", "test-client");
      vi.stubEnv("AUTHENTIK_CLIENT_SECRET", "test-secret");
      vi.stubEnv("AUTHENTIK_ISSUER", "https://auth.example/application/o/cal");
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              issuer: "https://auth.example/application/o/cal/",
              userinfo_endpoint: "https://auth.example/application/o/userinfo/",
              token_endpoint: "https://auth.example/application/o/token/",
            }),
            { status: 200 }
          )
        )
        .mockResolvedValueOnce(new Response(JSON.stringify({ groups: ["cal-users"] }), { status: 200 }));
      setupGetTokenMock(
        createMockToken({
          role: "ADMIN",
          authentikSubject: "auth-sub-1",
          authentikGroupsVerifiedAt: now.getTime() - 15 * 60 * 1000,
        })
      );
      prismaMock.user.findUnique.mockResolvedValue(createMockUser());
      prismaMock.account.findUnique.mockResolvedValue({
        userId: 5,
        access_token: "current-access-token",
        refresh_token: "current-refresh-token",
        expires_at: Math.floor(now.getTime() / 1000) + 3600,
      } as never);

      try {
        const session = await getServerSession({ req: createMockRequest() });

        expect(session?.user.role).toBe("USER");
        expect(globalThis.fetch).toHaveBeenCalledTimes(2);
      } finally {
        globalThis.fetch = originalFetch;
        vi.useRealTimers();
        vi.unstubAllEnvs();
      }
    });

    it("uses the verified Authentik role instead of the local database role", async () => {
      setupGetTokenMock(
        createMockToken({
          role: "ADMIN",
          authentikSubject: "auth-sub-2",
          authentikGroupsVerifiedAt: Date.now() - 60_000,
        })
      );
      prismaMock.user.findUnique.mockResolvedValue(createMockUser({ role: "USER" }));

      const session = await getServerSession({ req: createMockRequest() });

      expect(session?.user.role).toBe("ADMIN");
      expect(prismaMock.account.findUnique).not.toHaveBeenCalled();
    });

    it("fails closed when Authentik group verification fails", async () => {
      vi.useFakeTimers();
      const now = new Date("2026-11-04T12:00:00.000Z");
      vi.setSystemTime(now);
      vi.stubEnv("AUTHENTIK_CLIENT_ID", "test-client");
      vi.stubEnv("AUTHENTIK_CLIENT_SECRET", "test-secret");
      vi.stubEnv("AUTHENTIK_ISSUER", "https://auth.example/application/o/cal");
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("provider unavailable"));
      setupGetTokenMock(
        createMockToken({
          role: "ADMIN",
          authentikSubject: "auth-sub-3",
          authentikGroupsVerifiedAt: now.getTime() - 15 * 60 * 1000,
        })
      );
      prismaMock.user.findUnique.mockResolvedValue(createMockUser());
      prismaMock.account.findUnique.mockResolvedValue({
        userId: 5,
        access_token: "current-access-token",
        refresh_token: null,
        expires_at: Math.floor(now.getTime() / 1000) + 3600,
      } as never);

      try {
        const session = await getServerSession({ req: createMockRequest() });

        expect(session?.user.role).toBe("USER");
      } finally {
        globalThis.fetch = originalFetch;
        vi.useRealTimers();
        vi.unstubAllEnvs();
      }
    });

    it("returns null when user not found in database", async () => {
      setupGetTokenMock(createMockToken({ sub: "999" }));
      prismaMock.user.findUnique.mockResolvedValue(null);

      const result = await getServerSession({ req: createMockRequest() });
      expect(result).toBeNull();
    });

    it("returns session with correct user data", async () => {
      const mockUser = createMockUser();
      setupGetTokenMock(createMockToken());
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      const result = await getServerSession({ req: createMockRequest() });

      expect(result).toMatchObject({
        user: {
          id: mockUser.id,
          email: mockUser.email,
        },
      });
    });
  });

  describe("User Resolution", () => {
    it("resolves user by token subject ID", async () => {
      const token = createMockToken({
        sub: "999",
        email: "user@example.com",
      });

      setupGetTokenMock(token);
      prismaMock.user.findUnique.mockResolvedValue(null);

      await getServerSession({ req: createMockRequest() });

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: 999 },
      });
    });

    it("returns user data from database lookup", async () => {
      const dbUser = createMockUser({ id: 999, email: "db-user@example.com" });
      const token = createMockToken({
        sub: "999",
        email: "token-email@example.com",
      });

      setupGetTokenMock(token);
      prismaMock.user.findUnique.mockResolvedValue(dbUser);

      const result = await getServerSession({ req: createMockRequest() });

      expect(result).toMatchObject({
        user: {
          id: 999,
          email: "db-user@example.com",
        },
      });
    });

    it("uses ID field for database queries", async () => {
      const mockUser = createMockUser();
      setupGetTokenMock(createMockToken());
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      await getServerSession({ req: createMockRequest() });

      const calls = prismaMock.user.findUnique.mock.calls;
      for (const call of calls) {
        const whereClause = call[0]?.where as Record<string, unknown>;
        expect(whereClause).toHaveProperty("id");
        expect(whereClause).not.toHaveProperty("email");
      }
    });
  });
});
