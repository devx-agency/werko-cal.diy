import process from "node:process";
import { IdentityProvider, UserPermissionRole } from "@calcom/prisma/enums";
import { jwtVerify } from "jose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorCode } from "./ErrorCode";

// Mock dependencies
vi.mock("@calcom/prisma", () => ({
  prisma: {
    user: {
      update: vi.fn(),
    },
    account: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
  default: {
    user: {
      update: vi.fn(),
    },
    account: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const mockFindByEmailAndIncludeProfilesAndPassword = vi.fn();

vi.mock("@calcom/features/users/repositories/UserRepository", () => {
  return {
    UserRepository: vi.fn().mockImplementation(function () {
      return {
        findByEmailAndIncludeProfilesAndPassword: mockFindByEmailAndIncludeProfilesAndPassword,
      };
    }),
  };
});

vi.mock("./verifyPassword", () => ({
  verifyPassword: vi.fn(),
}));

vi.mock("@calcom/lib/checkRateLimitAndThrowError", () => ({
  checkRateLimitAndThrowError: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@calcom/lib/server/PiiHasher", () => ({
  hashEmail: vi.fn((email: string) => `hashed_${email}`),
}));

vi.mock("@calcom/lib/totp", () => ({
  totpAuthenticatorCheck: vi.fn(),
}));

vi.mock("@calcom/lib/crypto", () => ({
  symmetricDecrypt: vi.fn(),
  symmetricEncrypt: vi.fn(),
}));

vi.mock("@calcom/lib/auth/isPasswordValid", () => ({
  isPasswordValid: vi.fn(),
}));

vi.mock("@calcom/lib/env", () => ({
  isENVDev: false,
}));

vi.mock("@calcom/lib/constants", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@calcom/lib/constants")>();
  return {
    ...actual,
    IS_TEAM_BILLING_ENABLED: false,
    ENABLE_PROFILE_SWITCHER: false,
    WEBAPP_URL: "http://localhost:3000",
  };
});

const mockLoggerDebug = vi.fn();

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: vi.fn(() => ({
      debug: (...args: unknown[]) => mockLoggerDebug(...args),
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    })),
  },
}));

vi.mock("@calcom/lib/safeStringify", () => ({
  safeStringify: vi.fn((obj) => JSON.stringify(obj)),
}));

vi.mock("./next-auth-custom-adapter", () => ({
  default: vi.fn(() => ({ linkAccount: (...args: unknown[]) => mockLinkAccount(...args) })),
}));

vi.mock("@calcom/i18n/server", () => ({
  getTranslation: vi.fn().mockResolvedValue((key: string) => key),
}));

vi.mock("@calcom/features/profile/repositories/ProfileRepository", () => ({
  ProfileRepository: {
    findAllProfilesForUserIncludingMovedUser: vi.fn(),
    findByUpIdWithAuth: vi.fn(),
  },
}));

// Additional mocks for signIn/JWT callback tests
const mockCredentialRepoFindFirst = vi.fn();
const mockCredentialRepoFindFirstByUserIdAndType = vi.fn();
const mockCredentialRepoCreate = vi.fn();
const mockBuildCredentialCreateData = vi.fn();
const mockUpdateProfilePhotoMicrosoft = vi.fn();
const mockUpdateProfilePhotoGoogle = vi.fn();
const mockGetIdentityProvider = vi.fn();
const mockWaitUntil = vi.fn();
const mockPrismaUserFindFirst = vi.fn();
const mockPrismaUserCreate = vi.fn();
const mockPrismaUserUpdate = vi.fn();
const mockPrismaAccountFindUnique = vi.fn();
const mockPrismaAccountUpdate = vi.fn();
const mockPrismaTeamFindFirst = vi.fn();
const mockPrismaSelectedCalendarCreate = vi.fn();
const mockLinkAccount = vi.fn();

vi.mock("@calcom/features/credentials/repositories/CredentialRepository", () => ({
  CredentialRepository: {
    findFirstByAppIdAndUserId: (...args: unknown[]) => mockCredentialRepoFindFirst(...args),
    findFirstByUserIdAndType: (...args: unknown[]) => mockCredentialRepoFindFirstByUserIdAndType(...args),
    create: (...args: unknown[]) => mockCredentialRepoCreate(...args),
  },
}));

vi.mock("@calcom/features/credentials/services/CredentialDataService", () => ({
  buildCredentialCreateData: (...args: unknown[]) => mockBuildCredentialCreateData(...args),
}));

vi.mock("@calcom/app-store/_utils/oauth/updateProfilePhotoMicrosoft", () => ({
  updateProfilePhotoMicrosoft: (...args: unknown[]) => mockUpdateProfilePhotoMicrosoft(...args),
}));

vi.mock("@calcom/app-store/_utils/oauth/updateProfilePhotoGoogle", () => ({
  updateProfilePhotoGoogle: (...args: unknown[]) => mockUpdateProfilePhotoGoogle(...args),
}));

vi.mock("@calcom/features/auth/lib/identityProviders", () => ({
  getIdentityProvider: (...args: unknown[]) => mockGetIdentityProvider(...args),
}));

vi.mock("@calcom/features/auth/lib/outlook", () => ({
  OUTLOOK_CLIENT_ID: "mock-client-id",
  OUTLOOK_CLIENT_SECRET: "mock-client-secret",
  OUTLOOK_LOGIN_ENABLED: true,
}));

vi.mock("@vercel/functions", () => ({
  waitUntil: (...args: unknown[]) => mockWaitUntil(...args),
}));

vi.mock("@calcom/lib/default-cookies", () => ({
  defaultCookies: vi.fn(() => ({})),
}));

vi.mock("@calcom/lib/random", () => ({
  randomString: vi.fn(() => "abc123"),
}));

vi.mock("@calcom/lib/slugify", () => ({
  default: vi.fn((s: string) => s.toLowerCase().replace(/\s+/g, "-")),
}));

vi.mock("@calcom/app-store/googlecalendar/lib/CalendarService", () => ({
  createGoogleCalendarServiceWithGoogleType: vi.fn(),
}));

vi.mock("googleapis-common", () => ({
  OAuth2Client: vi.fn(),
}));

vi.mock("@googleapis/calendar", () => ({
  calendar_v3: {
    Calendar: vi.fn(),
  },
}));

vi.mock("jose", async (importOriginal) => ({
  ...(await importOriginal<typeof import("jose")>()),
  jwtVerify: vi.fn(),
}));
vi.mock("next-auth/jwt", () => ({
  encode: vi.fn(),
}));

vi.mock("./signJwt", () => ({
  default: vi.fn().mockResolvedValue("mock-jwt"),
}));

vi.mock("./dub", () => ({
  dub: { track: { lead: vi.fn() } },
}));

vi.mock("../signup/utils/getOrgUsernameFromEmail", () => ({
  getOrgUsernameFromEmail: vi.fn((email: string) => email.split("@")[0]),
}));

vi.mock("next-auth/providers/azure-ad", () => ({ default: vi.fn() }));
vi.mock("next-auth/providers/credentials", () => ({ default: vi.fn(() => ({ id: "credentials" })) }));
vi.mock("next-auth/providers/email", () => ({ default: vi.fn() }));
vi.mock("next-auth/providers/google", () => ({ default: vi.fn() }));

describe("Authentik configuration", () => {
  it("disables Authentik when no configuration is provided", async () => {
    const { getAuthentikConfiguration } = await import("./authentik");

    expect(getAuthentikConfiguration({})).toBeNull();
  });

  it("returns a complete Authentik configuration", async () => {
    const { getAuthentikConfiguration } = await import("./authentik");

    expect(
      getAuthentikConfiguration({
        AUTHENTIK_CLIENT_ID: " client-id ",
        AUTHENTIK_CLIENT_SECRET: " client-secret ",
        AUTHENTIK_ISSUER: " https://auth.example.com/application/o/cal/ ",
      })
    ).toEqual({
      clientId: "client-id",
      clientSecret: "client-secret",
      issuer: "https://auth.example.com/application/o/cal",
    });
  });

  it("rejects incomplete Authentik configuration without exposing values", async () => {
    const { getAuthentikConfiguration } = await import("./authentik");

    expect(() =>
      getAuthentikConfiguration({
        AUTHENTIK_CLIENT_ID: "client-id",
        AUTHENTIK_CLIENT_SECRET: "client-secret",
      })
    ).toThrow("Missing: AUTHENTIK_ISSUER");
  });
});

describe("CredentialsProvider authorize", () => {
  let authorizeCredentials: typeof import("./next-auth-options").authorizeCredentials;
  let verifyPassword: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockFindByEmailAndIncludeProfilesAndPassword.mockReset();

    const verifyPasswordModule = await import("./verifyPassword");
    verifyPassword = verifyPasswordModule.verifyPassword;

    // Import the exported authorize function directly
    const authModule = await import("./next-auth-options");
    authorizeCredentials = authModule.authorizeCredentials;
  });

  const createMockUser = (overrides: Partial<any> = {}) => ({
    id: 1,
    email: "test@example.com",
    name: "Test User",
    username: "testuser",
    role: UserPermissionRole.USER,
    locked: false,
    identityProvider: IdentityProvider.CAL,
    twoFactorEnabled: false,
    twoFactorSecret: null,
    backupCodes: null,
    password: {
      hash: "$2a$10$hashedpassword",
    },
    allProfiles: [
      {
        id: 1,
        upId: "usr_123",
        username: "testuser",
      },
    ],
    teams: [],
    ...overrides,
  });

  describe("Password validation", () => {
    it("should throw error when user has no password hash with CAL identity provider", async () => {
      const mockUser = createMockUser({
        password: null,
        identityProvider: IdentityProvider.CAL,
      });
      mockFindByEmailAndIncludeProfilesAndPassword.mockResolvedValue(mockUser);

      await expect(
        authorizeCredentials({
          email: "test@example.com",
          password: "password123",
        } as any)
      ).rejects.toThrow(ErrorCode.IncorrectEmailPassword);
    });

    it("should throw error when user has no password hash with Google identity provider", async () => {
      const mockUser = createMockUser({
        password: null,
        identityProvider: IdentityProvider.GOOGLE,
      });
      mockFindByEmailAndIncludeProfilesAndPassword.mockResolvedValue(mockUser);

      await expect(
        authorizeCredentials({
          email: "test@example.com",
          password: "password123",
        } as any)
      ).rejects.toThrow(ErrorCode.IncorrectEmailPassword);
    });

    it("should throw error when user has no password hash with SAML identity provider", async () => {
      const mockUser = createMockUser({
        password: null,
        identityProvider: IdentityProvider.SAML,
      });
      mockFindByEmailAndIncludeProfilesAndPassword.mockResolvedValue(mockUser);

      await expect(
        authorizeCredentials({
          email: "test@example.com",
          password: "password123",
        } as any)
      ).rejects.toThrow(ErrorCode.IncorrectEmailPassword);
    });

    it("should throw error when user has no password hash even with TOTP code provided", async () => {
      const mockUser = createMockUser({
        password: null,
        identityProvider: IdentityProvider.CAL,
      });
      mockFindByEmailAndIncludeProfilesAndPassword.mockResolvedValue(mockUser);

      await expect(
        authorizeCredentials({
          email: "test@example.com",
          password: "password123",
          totpCode: "123456",
        } as any)
      ).rejects.toThrow(ErrorCode.IncorrectEmailPassword);
    });

    it("should throw error when user has no password hash with Google identity provider and TOTP code", async () => {
      const mockUser = createMockUser({
        password: null,
        identityProvider: IdentityProvider.GOOGLE,
      });
      mockFindByEmailAndIncludeProfilesAndPassword.mockResolvedValue(mockUser);

      await expect(
        authorizeCredentials({
          email: "test@example.com",
          password: "password123",
          totpCode: "123456",
        } as any)
      ).rejects.toThrow(ErrorCode.IncorrectEmailPassword);
    });

    it("should throw error when user has no password hash with SAML identity provider and TOTP code", async () => {
      const mockUser = createMockUser({
        password: null,
        identityProvider: IdentityProvider.SAML,
      });
      mockFindByEmailAndIncludeProfilesAndPassword.mockResolvedValue(mockUser);

      await expect(
        authorizeCredentials({
          email: "test@example.com",
          password: "password123",
          totpCode: "123456",
        } as any)
      ).rejects.toThrow(ErrorCode.IncorrectEmailPassword);
    });
  });

  describe("Authentik second factor", () => {
    it("rejects credentials without a signed Authentik challenge", async () => {
      await expect(
        authorizeCredentials({
          email: "test@example.com",
          password: "password123",
          totpCode: "123456",
          backupCode: "",
        } as any)
      ).rejects.toThrow(ErrorCode.IncorrectEmailPassword);
    });
    it("accepts a valid TOTP challenge for an admin without a local password", async () => {
      const originalKey = process.env.CALENDSO_ENCRYPTION_KEY;
      process.env.CALENDSO_ENCRYPTION_KEY = "authentik-two-factor-test-key-1234";

      try {
        const { symmetricDecrypt } = await import("@calcom/lib/crypto");
        vi.mocked(symmetricDecrypt).mockReturnValue("a".repeat(32));
        const { totpAuthenticatorCheck } = await import("@calcom/lib/totp");
        vi.mocked(totpAuthenticatorCheck).mockReturnValue(true);

        const mockUser = createMockUser({
          role: UserPermissionRole.ADMIN,
          twoFactorEnabled: true,
          twoFactorSecret: "encrypted_secret",
          password: null,
        });
        mockFindByEmailAndIncludeProfilesAndPassword.mockResolvedValue(mockUser);
        const totpToken = "signed-totp-token";
        vi.mocked(jwtVerify).mockResolvedValue({ payload: { email: mockUser.email } } as never);

        const result = await authorizeCredentials({
          email: mockUser.email,
          totpToken,
          password: "",
          totpCode: "123456",
          backupCode: "",
        });

        expect(result?.role).toBe(UserPermissionRole.ADMIN);
      } finally {
        process.env.CALENDSO_ENCRYPTION_KEY = originalKey;
      }
    });
  });
});

describe("Azure AD signIn callback", () => {
  let getOptions: typeof import("./next-auth-options").getOptions;
  let signInCallback: NonNullable<ReturnType<typeof getOptions>["callbacks"]>["signIn"];

  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetIdentityProvider.mockImplementation((provider: string) => {
      const map: Record<string, string> = {
        "azure-ad": "AZUREAD",
        google: "GOOGLE",
        saml: "SAML",
        "saml-idp": "SAML",
        cal: "CAL",
      };
      return map[provider] ?? null;
    });

    // Mock prisma methods used in signIn callback
    const prismaModule = await import("@calcom/prisma");
    const prismaDefault = (prismaModule as any).default;
    prismaDefault.user = {
      ...prismaDefault.user,
      findFirst: mockPrismaUserFindFirst,
      create: mockPrismaUserCreate,
      update: mockPrismaUserUpdate,
    };
    prismaDefault.account = { findUnique: mockPrismaAccountFindUnique, update: mockPrismaAccountUpdate };
    prismaDefault.team = {
      findFirst: mockPrismaTeamFindFirst,
    };
    prismaDefault.selectedCalendar = {
      create: mockPrismaSelectedCalendarCreate,
    };

    mockPrismaUserFindFirst.mockResolvedValue(null);
    mockPrismaUserCreate.mockResolvedValue({ id: 100, email: "new@example.com", twoFactorEnabled: false });
    mockPrismaAccountFindUnique.mockResolvedValue(null);
    mockPrismaAccountUpdate.mockResolvedValue({});
    mockPrismaUserUpdate.mockResolvedValue({});
    mockPrismaTeamFindFirst.mockResolvedValue(null);
    mockUpdateProfilePhotoMicrosoft.mockResolvedValue(undefined);

    // Setup mock adapter
    const adapterModule = await import("./next-auth-custom-adapter");
    (adapterModule.default as any).mockReturnValue({ linkAccount: mockLinkAccount });
    mockLinkAccount.mockResolvedValue(undefined);

    mockWaitUntil.mockImplementation((p: Promise<any>) => p.catch(() => {}));

    const authModule = await import("./next-auth-options");
    getOptions = authModule.getOptions;
    const options = getOptions({ getDubId: () => undefined, getTrackingData: () => ({}) as any });
    signInCallback = options.callbacks!.signIn! as any;
  });

  describe("Authentik account linking", () => {
    const baseParams = {
      user: { id: "1", email: "user@example.com", name: "User", image: null, emailVerified: null },
      account: {
        provider: "authentik",
        providerAccountId: "auth-sub-1",
        type: "oauth" as const,
      },
      profile: {
        sub: "auth-sub-1",
        email: "user@example.com",
        email_verified: true,
        name: "Authentik User",
      },
      credentials: undefined,
      email: undefined,
    };

    it("rejects unverified Authentik email claims", async () => {
      const result = await signInCallback({
        ...baseParams,
        profile: { ...baseParams.profile, email_verified: false },
      } as any);

      expect(result).toBe("/auth/error?error=unverified-email");
      expect(mockPrismaUserFindFirst).not.toHaveBeenCalled();
      expect(mockLinkAccount).not.toHaveBeenCalled();
    });

    it("does not claim an unverified local account with the same email", async () => {
      mockPrismaUserFindFirst.mockResolvedValue({
        id: 53,
        email: "user@example.com",
        emailVerified: null,
        twoFactorEnabled: false,
        locked: false,
        accounts: [],
      });

      const result = await signInCallback(baseParams as any);

      expect(result).toBe("/auth/error?error=unverified-email");
      expect(mockLinkAccount).not.toHaveBeenCalled();
      expect(mockPrismaUserCreate).not.toHaveBeenCalled();
    });

    it("links a verified local account by Authentik provider and sub", async () => {
      mockPrismaUserFindFirst.mockResolvedValue({
        id: 53,
        email: "user@example.com",
        emailVerified: new Date(),
        twoFactorEnabled: false,
        locked: false,
        accounts: [],
      });

      const result = await signInCallback(baseParams as any);

      expect(result).toBe(true);
      expect(mockLinkAccount).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "authentik",
          providerAccountId: "auth-sub-1",
          userId: "53",
        })
      );
    });

    it("does not replace a different Authentik subject already linked to the email", async () => {
      mockPrismaUserFindFirst.mockResolvedValue({
        id: 53,
        email: "user@example.com",
        emailVerified: new Date(),
        twoFactorEnabled: false,
        locked: false,
        accounts: [{ providerAccountId: "different-sub" }],
      });

      const result = await signInCallback(baseParams as any);

      expect(result).toBe("/auth/error?error=wrong-provider&provider=CAL");
      expect(mockLinkAccount).not.toHaveBeenCalled();
    });

    it("creates a local user once and reuses the provider-sub account on later sign-ins", async () => {
      mockPrismaAccountFindUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
        user: {
          id: 100,
          email: "user@example.com",
          twoFactorEnabled: false,
          locked: false,
        },
      });
      mockPrismaUserFindFirst.mockResolvedValue(null);
      mockPrismaUserCreate.mockResolvedValue({
        id: 100,
        email: "user@example.com",
        twoFactorEnabled: false,
      });

      expect(await signInCallback(baseParams as any)).toBe(true);
      expect(await signInCallback(baseParams as any)).toBe(true);
      expect(mockPrismaUserCreate).toHaveBeenCalledTimes(1);
      expect(mockLinkAccount).toHaveBeenCalledTimes(1);
    });
  });

  describe("Azure AD email verification (xms_edov)", () => {
    const baseParams = {
      user: { id: "1", email: "user@example.com", name: "User", emailVerified: null },
      account: {
        provider: "azure-ad",
        providerAccountId: "azure-123",
        type: "oauth" as const,
      },
      credentials: undefined,
      email: undefined,
    };

    it("allows login when xms_edov is true (boolean)", async () => {
      mockPrismaUserFindFirst.mockResolvedValue({
        id: 1,
        email: "user@example.com",
        accounts: [{ provider: "azure-ad" }],
        twoFactorEnabled: false,
        identityProvider: "AZUREAD",
      });

      const result = await signInCallback({
        ...baseParams,
        profile: { email_verified: false, xms_edov: true } as any,
      } as any);

      expect(result).toBe(true);
    });

    it("allows login when xms_edov is string 'true'", async () => {
      mockPrismaUserFindFirst.mockResolvedValue({
        id: 1,
        email: "user@example.com",
        accounts: [{ provider: "azure-ad" }],
        twoFactorEnabled: false,
        identityProvider: "AZUREAD",
      });

      const result = await signInCallback({
        ...baseParams,
        profile: { xms_edov: "true" } as any,
      } as any);

      expect(result).toBe(true);
    });

    it("allows login when xms_edov is string '1'", async () => {
      mockPrismaUserFindFirst.mockResolvedValue({
        id: 1,
        email: "user@example.com",
        accounts: [{ provider: "azure-ad" }],
        twoFactorEnabled: false,
        identityProvider: "AZUREAD",
      });

      const result = await signInCallback({
        ...baseParams,
        profile: { xms_edov: "1" } as any,
      } as any);

      expect(result).toBe(true);
    });

    it("allows login when xms_edov is number 1", async () => {
      mockPrismaUserFindFirst.mockResolvedValue({
        id: 1,
        email: "user@example.com",
        accounts: [{ provider: "azure-ad" }],
        twoFactorEnabled: false,
        identityProvider: "AZUREAD",
      });

      const result = await signInCallback({
        ...baseParams,
        profile: { xms_edov: 1 } as any,
      } as any);

      expect(result).toBe(true);
    });

    it("rejects login when xms_edov is false", async () => {
      const result = await signInCallback({
        ...baseParams,
        profile: { xms_edov: false } as any,
      } as any);

      expect(result).toBe("/auth/error?error=unverified-email");
    });

    it("rejects login when xms_edov is undefined", async () => {
      const result = await signInCallback({
        ...baseParams,
        profile: {} as any,
      } as any);

      expect(result).toBe("/auth/error?error=unverified-email");
    });

    it("rejects login when xms_edov is 0", async () => {
      const result = await signInCallback({
        ...baseParams,
        profile: { xms_edov: 0 } as any,
      } as any);

      expect(result).toBe("/auth/error?error=unverified-email");
    });

    it("rejects login when xms_edov is string '0'", async () => {
      const result = await signInCallback({
        ...baseParams,
        profile: { xms_edov: "0" } as any,
      } as any);

      expect(result).toBe("/auth/error?error=unverified-email");
    });

    it("allows non-AZUREAD with email_verified=true", async () => {
      mockPrismaUserFindFirst.mockResolvedValue({
        id: 1,
        email: "user@example.com",
        accounts: [{ provider: "google" }],
        twoFactorEnabled: false,
        identityProvider: "GOOGLE",
      });

      const result = await signInCallback({
        user: { id: "1", email: "user@example.com", name: "User", emailVerified: null },
        account: { provider: "google", providerAccountId: "google-123", type: "oauth" as const },
        profile: { email_verified: true } as any,
        credentials: undefined,
        email: undefined,
      } as any);

      expect(result).toBe(true);
    });

    it("rejects non-AZUREAD with email_verified=false", async () => {
      const result = await signInCallback({
        user: { id: "1", email: "user@example.com", name: "User", emailVerified: null },
        account: { provider: "google", providerAccountId: "google-123", type: "oauth" as const },
        profile: { email_verified: false } as any,
        credentials: undefined,
        email: undefined,
      } as any);

      expect(result).toBe("/auth/error?error=unverified-email");
    });
  });

  describe("Azure AD profile photo on new user (signIn callback)", () => {
    const baseUser = { id: "1", email: "newuser@example.com", name: "New User", emailVerified: null };

    it("calls updateProfilePhotoMicrosoft for new Azure AD user with access_token", async () => {
      // No existing user
      mockPrismaUserFindFirst.mockResolvedValue(null);
      mockPrismaUserCreate.mockResolvedValue({
        id: 100,
        email: "newuser@example.com",
        twoFactorEnabled: false,
      });

      await signInCallback({
        user: baseUser,
        account: {
          provider: "azure-ad",
          providerAccountId: "azure-new-123",
          type: "oauth" as const,
          access_token: "new-user-token",
        },
        profile: { xms_edov: true } as any,
        credentials: undefined,
        email: undefined,
      } as any);

      expect(mockUpdateProfilePhotoMicrosoft).toHaveBeenCalledWith("new-user-token", 100);
    });

    it("skips updateProfilePhotoMicrosoft for new Azure AD user without access_token", async () => {
      mockPrismaUserFindFirst.mockResolvedValue(null);
      mockPrismaUserCreate.mockResolvedValue({
        id: 101,
        email: "newuser@example.com",
        twoFactorEnabled: false,
      });

      await signInCallback({
        user: baseUser,
        account: {
          provider: "azure-ad",
          providerAccountId: "azure-new-456",
          type: "oauth" as const,
        },
        profile: { xms_edov: true } as any,
        credentials: undefined,
        email: undefined,
      } as any);

      expect(mockUpdateProfilePhotoMicrosoft).not.toHaveBeenCalled();
    });

    it("skips updateProfilePhotoMicrosoft for new Google user", async () => {
      mockPrismaUserFindFirst.mockResolvedValue(null);
      mockPrismaUserCreate.mockResolvedValue({
        id: 102,
        email: "newuser@example.com",
        twoFactorEnabled: false,
      });

      await signInCallback({
        user: baseUser,
        account: {
          provider: "google",
          providerAccountId: "google-new-789",
          type: "oauth" as const,
          access_token: "google-token",
        },
        profile: { email_verified: true } as any,
        credentials: undefined,
        email: undefined,
      } as any);

      expect(mockUpdateProfilePhotoMicrosoft).not.toHaveBeenCalled();
    });

    it("photo update failure does not crash signup", async () => {
      mockPrismaUserFindFirst.mockResolvedValue(null);
      mockPrismaUserCreate.mockResolvedValue({
        id: 103,
        email: "newuser@example.com",
        twoFactorEnabled: false,
      });
      mockUpdateProfilePhotoMicrosoft.mockRejectedValue(new Error("Photo update failed"));

      const result = await signInCallback({
        user: baseUser,
        account: {
          provider: "azure-ad",
          providerAccountId: "azure-fail-123",
          type: "oauth" as const,
          access_token: "fail-token",
        },
        profile: { xms_edov: true } as any,
        credentials: undefined,
        email: undefined,
      } as any);

      // Should still return something (true or error redirect), not throw
      expect(result).toBeDefined();
    });
  });

  describe("Azure AD identity provider conversion (signIn callback)", () => {
    it("CAL user with verified email converts to AZUREAD on Azure AD login", async () => {
      // No existing user with AZUREAD identity
      mockPrismaUserFindFirst
        .mockResolvedValueOnce(null) // First call: lookup by identityProvider + providerAccountId
        .mockResolvedValueOnce(null) // Legacy lookup
        .mockResolvedValueOnce({
          // Lookup by email
          id: 50,
          email: "user@example.com",
          emailVerified: new Date(),
          identityProvider: "CAL",
          password: { hash: "hashed" },
          twoFactorEnabled: false,
        });

      const result = await signInCallback({
        user: { id: "1", email: "user@example.com", name: "User", emailVerified: null },
        account: { provider: "azure-ad", providerAccountId: "azure-conv-1", type: "oauth" as const },
        profile: { xms_edov: true } as any,
        credentials: undefined,
        email: undefined,
      } as any);

      expect(mockPrismaUserUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            identityProvider: "AZUREAD",
            identityProviderId: "azure-conv-1",
          }),
        })
      );
      expect(result).toBe(true);
    });

    it("GOOGLE user auto-merges on Azure AD login when email is verified", async () => {
      mockPrismaUserFindFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce({
        id: 51,
        email: "user@example.com",
        emailVerified: new Date(),
        identityProvider: "GOOGLE",
        password: null,
        twoFactorEnabled: false,
      });

      const result = await signInCallback({
        user: { id: "1", email: "user@example.com", name: "User", emailVerified: null },
        account: { provider: "azure-ad", providerAccountId: "azure-conv-2", type: "oauth" as const },
        profile: { xms_edov: true } as any,
        credentials: undefined,
        email: undefined,
      } as any);

      // With isVerified=true and non-CAL provider, auto-merge path is taken (returns true directly)
      expect(result).toBe(true);
    });

    it("AZUREAD user auto-merges on Google login when email is verified", async () => {
      mockPrismaUserFindFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce({
        id: 52,
        email: "user@example.com",
        emailVerified: new Date(),
        identityProvider: "AZUREAD",
        password: null,
        twoFactorEnabled: false,
      });

      const result = await signInCallback({
        user: { id: "1", email: "user@example.com", name: "User", emailVerified: null },
        account: { provider: "google", providerAccountId: "google-conv-1", type: "oauth" as const },
        profile: { email_verified: true } as any,
        credentials: undefined,
        email: undefined,
      } as any);

      // With isVerified=true and non-CAL provider, auto-merge path is taken (returns true directly)
      expect(result).toBe(true);
    });

    it("unverified CAL account blocks Azure AD linking (anti-hijack)", async () => {
      mockPrismaUserFindFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 53,
          email: "user@example.com",
          emailVerified: null,
          identityProvider: "CAL",
          password: { hash: "hashed" },
          twoFactorEnabled: false,
        });

      const result = await signInCallback({
        user: { id: "1", email: "user@example.com", name: "User", emailVerified: null },
        account: { provider: "azure-ad", providerAccountId: "azure-hijack-1", type: "oauth" as const },
        profile: { xms_edov: true } as any,
        credentials: undefined,
        email: undefined,
      } as any);

      expect(result).toBe("/auth/error?error=unverified-email");
    });
  });
});

describe("Azure AD JWT callback", () => {
  let getOptions: typeof import("./next-auth-options").getOptions;
  let jwtCallback: NonNullable<ReturnType<typeof getOptions>["callbacks"]>["jwt"];
  let sessionCallback: NonNullable<ReturnType<typeof getOptions>["callbacks"]>["session"];
  let originalFetch: typeof globalThis.fetch;

  beforeEach(async () => {
    vi.clearAllMocks();
    originalFetch = globalThis.fetch;
    mockGetIdentityProvider.mockImplementation((provider: string) => {
      const map: Record<string, string> = {
        "azure-ad": "AZUREAD",
        google: "GOOGLE",
        saml: "SAML",
        "saml-idp": "SAML",
        cal: "CAL",
      };
      return map[provider] ?? null;
    });
    mockCredentialRepoCreate.mockResolvedValue({ id: 1 });
    mockBuildCredentialCreateData.mockImplementation((data: any) => data);
    mockUpdateProfilePhotoMicrosoft.mockResolvedValue(undefined);

    // Setup prisma mocks
    const prismaModule = await import("@calcom/prisma");
    const prismaDefault = (prismaModule as any).default;
    prismaDefault.user = {
      ...prismaDefault.user,
      findFirst: mockPrismaUserFindFirst,
    };
    prismaDefault.account = { findUnique: mockPrismaAccountFindUnique, update: mockPrismaAccountUpdate };
    prismaDefault.selectedCalendar = {
      create: mockPrismaSelectedCalendarCreate,
    };
    prismaDefault.membership = {
      findUnique: vi.fn().mockResolvedValue(null),
    };

    mockPrismaSelectedCalendarCreate.mockResolvedValue({});
    mockPrismaAccountUpdate.mockResolvedValue({});

    const { ProfileRepository } = await import("@calcom/features/profile/repositories/ProfileRepository");
    (ProfileRepository.findAllProfilesForUserIncludingMovedUser as any).mockResolvedValue([
      { id: 1, upId: "usr_1" },
    ]);
    (ProfileRepository.findByUpIdWithAuth as any).mockResolvedValue({
      id: 1,
      username: "testuser",
      organization: null,
    });

    const authModule = await import("./next-auth-options");
    getOptions = authModule.getOptions;
    const options = getOptions({ getDubId: () => undefined, getTrackingData: () => ({}) as any });
    jwtCallback = options.callbacks!.jwt! as any;
    sessionCallback = options.callbacks!.session! as any;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("Azure AD calendar auto-install", () => {
    const baseToken = { sub: "1", email: "user@example.com", upId: "usr_1" } as any;
    const baseUser = {
      id: "1",
      email: "user@example.com",
      name: "Test",
      username: "test",
      role: "USER",
      locale: "en",
    } as any;

    it("creates office365-calendar credential on first login with all scopes", async () => {
      mockPrismaUserFindFirst.mockResolvedValue({
        id: 1,
        email: "user@example.com",
        name: "Test",
        username: "test",
        role: "USER",
        locale: "en",
        avatarUrl: null,
        identityProvider: "AZUREAD",
        identityProviderId: "azure-123",
        teams: [],
        movedToProfileId: null,
      });

      mockCredentialRepoFindFirst.mockResolvedValue(null);
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ value: [{ id: "cal-id-1", isDefaultCalendar: true }] }),
      }) as unknown as typeof fetch;

      await jwtCallback({
        token: baseToken,
        user: baseUser,
        account: {
          provider: "azure-ad",
          providerAccountId: "azure-123",
          type: "oauth",
          access_token: "at-123",
          refresh_token: "rt-123",
          expires_at: 1700000000,
          scope: "User.Read Calendars.Read Calendars.ReadWrite offline_access",
        },
        trigger: undefined,
        session: undefined,
      } as any);

      expect(mockBuildCredentialCreateData).toHaveBeenCalledWith(
        expect.objectContaining({
          appId: "office365-calendar",
          type: "office365_calendar",
        })
      );
      expect(mockCredentialRepoCreate).toHaveBeenCalled();
    });

    it("skips creation when office365-calendar credential already exists", async () => {
      mockPrismaUserFindFirst.mockResolvedValue({
        id: 1,
        email: "user@example.com",
        name: "Test",
        username: "test",
        role: "USER",
        locale: "en",
        avatarUrl: null,
        identityProvider: "AZUREAD",
        identityProviderId: "azure-123",
        teams: [],
        movedToProfileId: null,
      });
      mockCredentialRepoFindFirst.mockResolvedValue({ id: 99 });

      await jwtCallback({
        token: baseToken,
        user: baseUser,
        account: {
          provider: "azure-ad",
          providerAccountId: "azure-123",
          type: "oauth",
          access_token: "at-123",
          scope: "User.Read Calendars.Read Calendars.ReadWrite",
        },
        trigger: undefined,
        session: undefined,
      } as any);

      expect(mockBuildCredentialCreateData).not.toHaveBeenCalledWith(
        expect.objectContaining({ appId: "office365-calendar" })
      );
    });

    it("skips creation when calendar scopes are missing", async () => {
      mockPrismaUserFindFirst.mockResolvedValue({
        id: 1,
        email: "user@example.com",
        name: "Test",
        username: "test",
        role: "USER",
        locale: "en",
        avatarUrl: null,
        identityProvider: "AZUREAD",
        identityProviderId: "azure-123",
        teams: [],
        movedToProfileId: null,
      });
      mockCredentialRepoFindFirst.mockResolvedValue(null);

      await jwtCallback({
        token: baseToken,
        user: baseUser,
        account: {
          provider: "azure-ad",
          providerAccountId: "azure-123",
          type: "oauth",
          access_token: "at-123",
          scope: "User.Read",
        },
        trigger: undefined,
        session: undefined,
      } as any);

      expect(mockCredentialRepoCreate).not.toHaveBeenCalled();
    });

    it("offline_access is excluded from scope check", async () => {
      mockPrismaUserFindFirst.mockResolvedValue({
        id: 1,
        email: "user@example.com",
        name: "Test",
        username: "test",
        role: "USER",
        locale: "en",
        avatarUrl: null,
        identityProvider: "AZUREAD",
        identityProviderId: "azure-123",
        teams: [],
        movedToProfileId: null,
      });
      mockCredentialRepoFindFirst.mockResolvedValue(null);
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ value: [] }),
      }) as unknown as typeof fetch;

      // Scope without offline_access — should still pass scope check
      await jwtCallback({
        token: baseToken,
        user: baseUser,
        account: {
          provider: "azure-ad",
          providerAccountId: "azure-123",
          type: "oauth",
          access_token: "at-123",
          scope: "User.Read Calendars.Read Calendars.ReadWrite",
        },
        trigger: undefined,
        session: undefined,
      } as any);

      expect(mockCredentialRepoCreate).toHaveBeenCalled();
    });

    it("fetches default calendar and creates selectedCalendar", async () => {
      mockPrismaUserFindFirst.mockResolvedValue({
        id: 1,
        email: "user@example.com",
        name: "Test",
        username: "test",
        role: "USER",
        locale: "en",
        avatarUrl: null,
        identityProvider: "AZUREAD",
        identityProviderId: "azure-123",
        teams: [],
        movedToProfileId: null,
      });
      mockCredentialRepoFindFirst.mockResolvedValue(null);
      mockCredentialRepoCreate.mockResolvedValue({ id: 77 });
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            value: [
              { id: "non-default-cal", isDefaultCalendar: false },
              { id: "default-cal-id", isDefaultCalendar: true },
            ],
          }),
      }) as unknown as typeof fetch;

      await jwtCallback({
        token: baseToken,
        user: baseUser,
        account: {
          provider: "azure-ad",
          providerAccountId: "azure-123",
          type: "oauth",
          access_token: "at-123",
          scope: "User.Read Calendars.Read Calendars.ReadWrite",
        },
        trigger: undefined,
        session: undefined,
      } as any);

      expect(mockPrismaSelectedCalendarCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          integration: "office365_calendar",
          externalId: "default-cal-id",
          credentialId: 77,
        }),
      });
    });

    it("Graph API fetch failure logs error but does not crash", async () => {
      mockPrismaUserFindFirst.mockResolvedValue({
        id: 1,
        email: "user@example.com",
        name: "Test",
        username: "test",
        role: "USER",
        locale: "en",
        avatarUrl: null,
        identityProvider: "AZUREAD",
        identityProviderId: "azure-123",
        teams: [],
        movedToProfileId: null,
      });
      mockCredentialRepoFindFirst.mockResolvedValue(null);
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error")) as unknown as typeof fetch;

      // Should not throw
      const result = await jwtCallback({
        token: baseToken,
        user: baseUser,
        account: {
          provider: "azure-ad",
          providerAccountId: "azure-123",
          type: "oauth",
          access_token: "at-123",
          scope: "User.Read Calendars.Read Calendars.ReadWrite",
        },
        trigger: undefined,
        session: undefined,
      } as any);

      expect(result).toBeDefined();
    });

    it("calls updateProfilePhotoMicrosoft after calendar install", async () => {
      mockPrismaUserFindFirst.mockResolvedValue({
        id: 1,
        email: "user@example.com",
        name: "Test",
        username: "test",
        role: "USER",
        locale: "en",
        avatarUrl: null,
        identityProvider: "AZUREAD",
        identityProviderId: "azure-123",
        teams: [],
        movedToProfileId: null,
      });
      mockCredentialRepoFindFirst.mockResolvedValue(null);
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ value: [] }),
      }) as unknown as typeof fetch;

      await jwtCallback({
        token: baseToken,
        user: baseUser,
        account: {
          provider: "azure-ad",
          providerAccountId: "azure-123",
          type: "oauth",
          access_token: "photo-token",
          scope: "User.Read Calendars.Read Calendars.ReadWrite",
        },
        trigger: undefined,
        session: undefined,
      } as any);

      expect(mockUpdateProfilePhotoMicrosoft).toHaveBeenCalledWith("photo-token", 1);
    });

    it("calls updateProfilePhotoMicrosoft even when calendar already installed (else-if branch)", async () => {
      mockPrismaUserFindFirst.mockResolvedValue({
        id: 1,
        email: "user@example.com",
        name: "Test",
        username: "test",
        role: "USER",
        locale: "en",
        avatarUrl: null,
        identityProvider: "AZUREAD",
        identityProviderId: "azure-123",
        teams: [],
        movedToProfileId: null,
      });
      // Calendar credential already exists
      mockCredentialRepoFindFirst.mockResolvedValue({ id: 99 });

      await jwtCallback({
        token: baseToken,
        user: baseUser,
        account: {
          provider: "azure-ad",
          providerAccountId: "azure-123",
          type: "oauth",
          access_token: "photo-token-2",
          scope: "User.Read Calendars.Read Calendars.ReadWrite",
        },
        trigger: undefined,
        session: undefined,
      } as any);

      expect(mockUpdateProfilePhotoMicrosoft).toHaveBeenCalledWith("photo-token-2", 1);
    });

    it("converts expires_at from seconds to milliseconds in credential key", async () => {
      mockPrismaUserFindFirst.mockResolvedValue({
        id: 1,
        email: "user@example.com",
        name: "Test",
        username: "test",
        role: "USER",
        locale: "en",
        avatarUrl: null,
        identityProvider: "AZUREAD",
        identityProviderId: "azure-123",
        teams: [],
        movedToProfileId: null,
      });
      mockCredentialRepoFindFirst.mockResolvedValue(null);
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ value: [] }),
      }) as unknown as typeof fetch;

      const expiresAtSeconds = 1700000000;

      await jwtCallback({
        token: baseToken,
        user: baseUser,
        account: {
          provider: "azure-ad",
          providerAccountId: "azure-123",
          type: "oauth",
          access_token: "at-123",
          refresh_token: "rt-123",
          expires_at: expiresAtSeconds,
          scope: "User.Read Calendars.Read Calendars.ReadWrite",
        },
        trigger: undefined,
        session: undefined,
      } as any);

      expect(mockBuildCredentialCreateData).toHaveBeenCalledWith(
        expect.objectContaining({
          key: expect.objectContaining({
            expiry_date: expiresAtSeconds * 1000,
          }),
        })
      );
    });
  });

  it("builds a session from the local user linked to an Authentik provider-sub account", async () => {
    mockPrismaAccountFindUnique.mockResolvedValue({
      user: {
        id: 53,
        name: "Local User",
        username: "local-user",
        email: "user@example.com",
        avatarUrl: null,
        role: "USER",
        locale: "en",
        teams: [],
        movedToProfileId: null,
      },
    });

    const token = await jwtCallback({
      token: { sub: "53", email: "user@example.com" },
      user: { id: "53", email: "user@example.com", name: "Local User" },
      account: {
        provider: "authentik",
        providerAccountId: "auth-sub-1",
        type: "oauth",
        access_token: "do-not-log-or-expose-this",
        id_token: "do-not-log-or-expose-this-either",
      },
    } as any);

    const session = await sessionCallback({
      session: {
        expires: new Date().toISOString(),
        user: { email: "user@example.com" },
      },
      token,
    } as any);

    expect(mockPrismaAccountFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          provider_providerAccountId: {
            provider: "authentik",
            providerAccountId: "auth-sub-1",
          },
        },
      })
    );
    expect(token.id).toBe(53);
    expect(session.user.id).toBe(53);
    expect(session.user.email).toBe("user@example.com");
    expect(session).not.toHaveProperty("access_token");
    expect(session).not.toHaveProperty("id_token");
    expect(JSON.stringify(mockLoggerDebug.mock.calls)).not.toContain("do-not-log");
  });

  describe("Authentik JWT group claim", () => {
    const authentikAccount = {
      provider: "authentik",
      providerAccountId: "auth-sub-1",
      type: "oauth" as const,
    };

    beforeEach(() => {
      mockPrismaAccountFindUnique.mockResolvedValue({
        user: {
          id: 53,
          name: "Local User",
          username: "local-user",
          email: "user@example.com",
          avatarUrl: null,
          role: UserPermissionRole.USER,
          locale: "en",
          teams: [],
          movedToProfileId: null,
        },
      });
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("grants ADMIN when the OIDC groups claim contains cal-admins", async () => {
      const token = await jwtCallback({
        token: { sub: "53", email: "user@example.com" },
        user: { id: "53", email: "user@example.com", name: "Local User" },
        account: authentikAccount,
        profile: { sub: "auth-sub-1", groups: ["cal-admins"] },
      } as any);

      expect(token.role).toBe(UserPermissionRole.ADMIN);

      const session = await sessionCallback({
        session: {
          expires: new Date().toISOString(),
          user: { email: "user@example.com" },
        },
        token,
      } as any);

      expect(session.user.role).toBe(UserPermissionRole.ADMIN);
    });

    it("assigns USER when the OIDC groups claim does not contain cal-admins", async () => {
      const token = await jwtCallback({
        token: { sub: "53", email: "user@example.com" },
        user: { id: "53", email: "user@example.com", name: "Local User" },
        account: authentikAccount,
        profile: { sub: "auth-sub-1", groups: ["other-group"] },
      } as any);

      expect(token.role).toBe(UserPermissionRole.USER);
    });

    it.each([
      undefined,
      null,
      "cal-admins",
      ["other-group", 1, "cal-admins"],
    ])("assigns USER for a missing or invalid groups claim (%s)", async (groups) => {
      const token = await jwtCallback({
        token: { sub: "53", email: "user@example.com" },
        user: { id: "53", email: "user@example.com", name: "Local User" },
        account: authentikAccount,
        profile: { sub: "auth-sub-1", groups },
      } as any);

      expect(token.role).toBe(UserPermissionRole.USER);
    });

    it("ignores a client-submitted role in a session update", async () => {
      const token = await jwtCallback({
        token: { role: UserPermissionRole.USER },
        trigger: "update",
        session: { role: UserPermissionRole.ADMIN },
      } as any);

      expect(token.role).toBe(UserPermissionRole.USER);
    });

    it("downgrades a removed admin to USER when 15 minutes have elapsed", async () => {
      vi.useFakeTimers();
      vi.stubEnv("AUTHENTIK_CLIENT_ID", "test-client");
      vi.stubEnv("AUTHENTIK_CLIENT_SECRET", "test-secret");
      vi.stubEnv("AUTHENTIK_ISSUER", "https://auth.example/application/o/cal");
      const now = new Date("2026-11-04T12:00:00.000Z");
      vi.setSystemTime(now);
      mockPrismaAccountFindUnique.mockResolvedValueOnce({
        userId: 53,
        access_token: "current-access-token",
        refresh_token: "current-refresh-token",
        expires_at: Math.floor(now.getTime() / 1000) + 3600,
      });
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

      try {
        const token = await jwtCallback({
          token: {
            id: 53,
            role: UserPermissionRole.ADMIN,
            authentikSubject: "auth-sub-1",
            authentikGroupsVerifiedAt: now.getTime() - 15 * 60 * 1000,
          },
        } as any);

        expect(token.role).toBe(UserPermissionRole.USER);
        expect(token.authentikGroupsVerifiedAt).toBe(now.getTime());
        expect(globalThis.fetch).toHaveBeenCalledTimes(2);

        const session = await sessionCallback({
          session: {
            expires: new Date().toISOString(),
            user: { email: "user@example.com" },
          },
          token,
        } as any);

        expect(session.user.role).toBe(UserPermissionRole.USER);
      } finally {
        vi.useRealTimers();
      }
    });

    it("refreshes expired provider tokens before checking current group membership", async () => {
      vi.useFakeTimers();
      vi.stubEnv("AUTHENTIK_CLIENT_ID", "test-client");
      vi.stubEnv("AUTHENTIK_CLIENT_SECRET", "test-secret");
      vi.stubEnv("AUTHENTIK_ISSUER", "https://auth.example/application/o/cal");
      const now = new Date("2026-11-04T12:00:00.000Z");
      vi.setSystemTime(now);
      mockPrismaAccountFindUnique.mockResolvedValueOnce({
        userId: 53,
        access_token: "expired-access-token",
        refresh_token: "old-refresh-token",
        expires_at: Math.floor(now.getTime() / 1000) - 1,
      });
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
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              access_token: "new-access-token",
              refresh_token: "new-refresh-token",
              expires_in: 3600,
            }),
            { status: 200 }
          )
        )
        .mockResolvedValueOnce(new Response(JSON.stringify({ groups: ["cal-admins"] }), { status: 200 }));

      try {
        const token = await jwtCallback({
          token: {
            id: 53,
            role: UserPermissionRole.USER,
            authentikSubject: "auth-sub-1",
            authentikGroupsVerifiedAt: now.getTime() - 15 * 60 * 1000,
          },
        } as any);

        expect(token.role).toBe(UserPermissionRole.ADMIN);
        expect(mockPrismaAccountUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            data: {
              access_token: "new-access-token",
              refresh_token: "new-refresh-token",
              expires_at: Math.floor(now.getTime() / 1000) + 3600,
            },
          })
        );
        expect(globalThis.fetch).toHaveBeenCalledTimes(3);
      } finally {
        vi.useRealTimers();
      }
    });

    it("fails closed when Authentik cannot revalidate group membership", async () => {
      vi.useFakeTimers();
      vi.stubEnv("AUTHENTIK_CLIENT_ID", "test-client");
      vi.stubEnv("AUTHENTIK_CLIENT_SECRET", "test-secret");
      vi.stubEnv("AUTHENTIK_ISSUER", "https://auth.example/application/o/cal");
      const now = new Date("2026-11-04T12:00:00.000Z");
      vi.setSystemTime(now);
      mockPrismaAccountFindUnique.mockResolvedValueOnce({
        userId: 53,
        access_token: "current-access-token",
        refresh_token: null,
        expires_at: Math.floor(now.getTime() / 1000) + 3600,
      });
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("provider unavailable"));

      try {
        const token = await jwtCallback({
          token: {
            id: 53,
            role: UserPermissionRole.ADMIN,
            authentikSubject: "auth-sub-1",
            authentikGroupsVerifiedAt: now.getTime() - 15 * 60 * 1000,
          },
        } as any);

        expect(token.role).toBe(UserPermissionRole.USER);
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
