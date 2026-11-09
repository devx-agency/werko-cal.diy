import { BookingAccessService } from "@calcom/features/bookings/services/BookingAccessService";
import type { PrismaClient } from "@calcom/prisma";
import { TRPCError } from "@trpc/server";
import type { TFindInputSchema } from "./find.schema";

type GetOptions = {
  ctx: {
    user: { id: number };
    prisma: PrismaClient;
  };
  input: TFindInputSchema;
};

export const getHandler = async ({ ctx, input }: GetOptions) => {
  const { prisma } = ctx;
  const { bookingUid } = input;

  const bookingAccessService = new BookingAccessService(prisma);
  const hasAccess = await bookingAccessService.doesUserIdHaveAccessToBooking({
    userId: ctx.user.id,
    bookingUid,
  });

  if (!hasAccess) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission to view this booking" });
  }

  const booking = await prisma.booking.findUnique({
    where: {
      uid: bookingUid,
    },
    select: {
      id: true,
      uid: true,
      startTime: true,
      endTime: true,
      description: true,
      status: true,
      paid: true,
      eventTypeId: true,
    },
  });

  // Don't leak anything private from the booking
  return {
    booking,
  };
};
