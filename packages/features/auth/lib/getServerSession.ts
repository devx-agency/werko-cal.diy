import process from "node:process";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";
import { UserPermissionRole } from "@calcom/prisma/enums";
import { LRUCache } from "lru-cache";
import type { GetServerSidePropsContext, NextApiRequest } from "next";
import type { AuthOptions, Session } from "next-auth";
import { getToken } from "next-auth/jwt";
import { getAuthentikConfiguration } from "./authentik";
import { verifyAuthentikRole } from "./authentikRole";

class LicenseKeySingleton {
  static async getInstance(..._args: unknown[]) {
    return new LicenseKeySingleton();
  }
  async checkLicense() {
    return true;
  }
  async validateLicenseKey() {
    return true;
  }
}
class DeploymentRepository {
  constructor(_prisma?: unknown) {}
  async findFirst(..._args: unknown[]) {
    return null;
  }
}

const log = logger.getSubLogger({ prefix: ["getServerSession"] });
/**
 * Stores the session in memory using the stringified token as the key.
 *
 */
const CACHE = new LRUCache<string, Session>({ max: 1000 });

/**
 * This is a slimmed down version of the `getServerSession` function from
 * `next-auth`.
 *
 * Instead of requiring the entire options object for NextAuth, we create
 * a compatible session using information from the incoming token.
 *
 * The downside to this is that we won't refresh sessions if the users
 * token has expired (30 days). This should be fine as we call `/auth/session`
 * frequently enough on the client-side to keep the session alive.
 */
export async function getServerSession(options: {
  req: NextApiRequest | GetServerSidePropsContext["req"];
  authOptions?: AuthOptions;
}) {
  const { req, authOptions: { secret } = {} } = options;

  const token = await getToken({
    req,
    secret,
  });

  log.debug("Getting server session", safeStringify({ token }));

  if (!token || !token.email || !token.sub) {
    log.debug("Couldn't get token");
    return null;
  }

  const cacheKey = JSON.stringify(token);
  const cachedSession = CACHE.get(cacheKey);

  if (cachedSession) {
    log.debug("Returning cached session", safeStringify(cachedSession));
    return cachedSession;
  }

  const userId = token.sub ? Number(token.sub) : null;

  if (!userId || userId <= 0) {
    log.warn("Invalid or missing user ID in token", { sub: token.sub });
    return null;
  }

  const userFromDb = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!userFromDb) {
    log.warn("No user found for valid token", { userId });
    return null;
  }

  let sessionRole = userFromDb.role;
  let authentikRoleCacheTtl: number | undefined;
  let shouldCacheSession = true;
  const authentikSubject = token.authentikSubject;
  if (authentikSubject) {
    const now = Date.now();
    const lastVerifiedAt = token.authentikGroupsVerifiedAt;
    const roleVerificationInterval = 15 * 60 * 1000;
    if (
      typeof lastVerifiedAt === "number" &&
      Number.isFinite(lastVerifiedAt) &&
      now >= lastVerifiedAt &&
      now - lastVerifiedAt < roleVerificationInterval
    ) {
      sessionRole =
        token.role === UserPermissionRole.ADMIN ? UserPermissionRole.ADMIN : UserPermissionRole.USER;
      authentikRoleCacheTtl = lastVerifiedAt + roleVerificationInterval - now;
    } else {
      try {
        const authentikConfig = getAuthentikConfiguration({
          AUTHENTIK_CLIENT_ID: process.env.AUTHENTIK_CLIENT_ID,
          AUTHENTIK_CLIENT_SECRET: process.env.AUTHENTIK_CLIENT_SECRET,
          AUTHENTIK_ISSUER: process.env.AUTHENTIK_ISSUER,
        });
        if (!authentikConfig) {
          throw new Error("Authentik is not configured");
        }

        const account = await prisma.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: "authentik",
              providerAccountId: authentikSubject,
            },
          },
          select: {
            userId: true,
            access_token: true,
            refresh_token: true,
            expires_at: true,
          },
        });
        if (!account || account.userId !== userId) {
          throw new Error("Authentik account is not linked to the session user");
        }

        sessionRole = await verifyAuthentikRole({
          ...authentikConfig,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at,
          onTokensRefreshed: async ({ accessToken, refreshToken, expiresAt }) => {
            await prisma.account.update({
              where: {
                provider_providerAccountId: {
                  provider: "authentik",
                  providerAccountId: authentikSubject,
                },
              },
              data: {
                access_token: accessToken,
                refresh_token: refreshToken,
                expires_at: expiresAt,
              },
            });
          },
        });
        authentikRoleCacheTtl = roleVerificationInterval;
      } catch (error) {
        log.error("Authentik group revalidation failed", {
          errorName: error instanceof Error ? error.name : "UnknownError",
        });
        sessionRole = UserPermissionRole.USER;
        shouldCacheSession = false;
      }
    }
  }

  const deploymentRepo = new DeploymentRepository(prisma);
  const licenseKeyService = await LicenseKeySingleton.getInstance(deploymentRepo);
  const hasValidLicense = await licenseKeyService.checkLicense();

  let upId = token.upId;

  if (!upId) {
    upId = `usr-${userFromDb.id}`;
  }

  if (!upId) {
    log.error("No upId found for session", { userId: userFromDb.id });
    return null;
  }

  const userRepository = new UserRepository(prisma);
  const user = await userRepository.enrichUserWithTheProfile({
    user: userFromDb,
    upId,
  });

  const session: Session = {
    hasValidLicense,
    expires: new Date(typeof token.exp === "number" ? token.exp * 1000 : Date.now()).toISOString(),
    user: {
      id: user.id,
      uuid: user.uuid,
      name: user.name,
      username: user.username,
      email: user.email,
      emailVerified: user.emailVerified,
      email_verified: user.emailVerified !== null,
      completedOnboarding: user.completedOnboarding,
      role: sessionRole,
      image: getUserAvatarUrl({
        avatarUrl: user.avatarUrl,
      }),
      belongsToActiveTeam: token.belongsToActiveTeam,
      org: token.org,
      orgAwareUsername: token.orgAwareUsername,
      locale: user.locale ?? undefined,
      profile: user.profile,
    },
    profileId: token.profileId,
    upId,
  };

  if (token?.impersonatedBy?.id) {
    const impersonatedByUser = await prisma.user.findUnique({
      where: {
        id: token.impersonatedBy.id,
      },
      select: {
        id: true,
        uuid: true,
        role: true,
      },
    });
    if (impersonatedByUser) {
      session.user.impersonatedBy = {
        id: impersonatedByUser?.id,
        uuid: impersonatedByUser.uuid,
        role: impersonatedByUser.role,
      };
    }
  }

  if (shouldCacheSession) {
    CACHE.set(
      cacheKey,
      session,
      token.authentikSubject && authentikRoleCacheTtl !== undefined
        ? { ttl: authentikRoleCacheTtl }
        : undefined
    );
  }

  log.debug("Returned session", safeStringify(session));
  return session;
}
