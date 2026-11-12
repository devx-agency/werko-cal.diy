import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { maybeGetBookingUidFromSeat } from "@calcom/lib/server/maybeGetBookingUidFromSeat";
import prisma from "@calcom/prisma";
import { UserPermissionRole } from "@calcom/prisma/enums";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import type { SearchParams } from "app/_types";
import { cookies, headers } from "next/headers";
import { forbidden, notFound, redirect } from "next/navigation";

type AuthenticatedUser = {
  id: number;
  email?: string | null;
  emailVerified?: Date | null;
};

export function createLocalPath(pathname: string, searchParams?: SearchParams): string {
  if (
    !pathname.startsWith("/") ||
    pathname.startsWith("//") ||
    pathname.includes("\\") ||
    pathname.includes("#")
  ) {
    throw new Error("Expected a safe, local pathname");
  }

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (Array.isArray(value)) {
      for (const item of value) query.append(key, item);
    } else if (typeof value === "string") {
      query.set(key, value);
    }
  }

  const queryString = query.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}

export async function requireAuthenticatedPage(callbackPath: string) {
  const requestHeaders = await headers();
  const requestCookies = await cookies();
  const session = await getServerSession({
    req: buildLegacyRequest(requestHeaders, requestCookies),
  });

  if (!session?.user?.id) {
    redirect(`/auth/login?callbackUrl=${encodeURIComponent(callbackPath)}`);
  }

  return session;
}

export async function requireAdminPage(callbackPath: string) {
  const session = await requireAuthenticatedPage(callbackPath);

  if (session.user.role !== UserPermissionRole.ADMIN) {
    forbidden();
  }

  return session;
}

export async function requireBookingAccess(uid: string, user: AuthenticatedUser): Promise<void> {
  const { uid: bookingUid } = await maybeGetBookingUidFromSeat(prisma, uid);
  const booking = await prisma.booking.findUnique({
    where: { uid: bookingUid },
    select: {
      userId: true,
      attendees: {
        select: {
          email: true,
        },
      },
      eventType: {
        select: {
          owner: {
            select: {
              id: true,
            },
          },
          hosts: {
            select: {
              userId: true,
            },
          },
        },
      },
    },
  });

  if (!booking) {
    notFound();
  }

  const email = user.emailVerified ? user.email?.toLowerCase() : undefined;
  const canAccess =
    booking.userId === user.id ||
    booking.eventType?.owner?.id === user.id ||
    booking.eventType?.hosts.some((host) => host.userId === user.id) ||
    (!!email && booking.attendees.some((attendee) => attendee.email.toLowerCase() === email));

  if (!canAccess) {
    notFound();
  }
}

export async function requireBookingQueryAccess(
  searchParams: SearchParams,
  user: AuthenticatedUser
): Promise<void> {
  const uid = searchParams.rescheduleUid ?? searchParams.bookingUid;
  const bookingUid = Array.isArray(uid) ? uid[0] : uid;

  if (bookingUid && bookingUid !== "null") {
    await requireBookingAccess(bookingUid, user);
  }
}
