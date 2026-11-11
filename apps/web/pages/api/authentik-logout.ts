import process from "node:process";
import { AUTHENTIK_CONFIG } from "@calcom/features/auth/lib/authentik";
import {
  getAuthentikLogoutUrl,
  getSafePostLogoutRedirectUri,
} from "@calcom/features/auth/lib/authentikLogout";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { defaultCookies } from "@calcom/lib/default-cookies";
import { getSessionCookieNames } from "@lib/sessionCookies";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";

const log = logger.getSubLogger({ prefix: ["authentik-logout"] });
const sessionCookie = defaultCookies(WEBAPP_URL?.startsWith("https://")).sessionToken;

function clearSessionCookies(req: NextApiRequest, res: NextApiResponse) {
  const cookieNames = getSessionCookieNames(sessionCookie.name, Object.keys(req.cookies));
  const { domain, path, sameSite, secure } = sessionCookie.options;
  const cookieAttributes = [
    `Path=${path ?? "/"}`,
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "HttpOnly",
    sameSite && `SameSite=${sameSite}`,
    secure && "Secure",
    domain && `Domain=${domain}`,
  ].filter(Boolean);

  res.setHeader(
    "Set-Cookie",
    cookieNames.map((name) => `${name}=; ${cookieAttributes.join("; ")}`)
  );
}

export default async function authentikLogout(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).end("Method not allowed");
    return;
  }

  const callbackUrl = Array.isArray(req.query.callbackUrl) ? req.query.callbackUrl[0] : req.query.callbackUrl;
  const postLogoutRedirect = getSafePostLogoutRedirectUri(callbackUrl, WEBAPP_URL);
  let redirectToAuthentik: string | null = null;
  let logoutFailed = false;

  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: sessionCookie.name,
    });
    const userId = Number(token?.sub);

    if (AUTHENTIK_CONFIG && Number.isSafeInteger(userId) && userId > 0) {
      const account = await prisma.account.findFirst({
        where: { userId, provider: "authentik" },
        select: { id_token: true },
      });

      if (account) {
        if (!account.id_token) {
          logoutFailed = true;
        } else {
          redirectToAuthentik = await getAuthentikLogoutUrl({
            issuer: AUTHENTIK_CONFIG.issuer,
            clientId: AUTHENTIK_CONFIG.clientId,
            idToken: account.id_token,
            postLogoutRedirectUri: postLogoutRedirect.toString(),
          });
        }
      }
    }
  } catch (error) {
    logoutFailed = true;
    log.error("Unable to complete Authentik single logout", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
  }

  clearSessionCookies(req, res);

  if (redirectToAuthentik) {
    res.redirect(302, redirectToAuthentik);
    return;
  }

  if (logoutFailed) {
    const failureRedirect = new URL("/auth/logout", WEBAPP_URL);
    failureRedirect.searchParams.set("authentikLogout", "failed");
    res.redirect(302, failureRedirect.toString());
    return;
  }
  res.redirect(302, postLogoutRedirect.toString());
}
