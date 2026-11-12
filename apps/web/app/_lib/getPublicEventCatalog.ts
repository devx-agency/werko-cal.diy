import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

type PublicEventTypeSelect = {
  title: true;
  description: true;
  length: true;
  slug: true;
  users: {
    where: {
      profiles: {
        none: Record<string, never>;
      };
    };
    select: {
      name: true;
      username: true;
    };
  };
};

const publicEventTypeSelect: PublicEventTypeSelect = {
  title: true,
  description: true,
  length: true,
  slug: true,
  users: {
    where: {
      profiles: {
        none: {},
      },
    },
    select: {
      name: true,
      username: true,
    },
  },
} satisfies Prisma.EventTypeSelect;

type PublicEventTypeQueryShape = {
  where: {
    hidden: false;
    teamId: null;
    users: {
      some: {
        username: {
          not: null;
        };
        profiles: {
          none: Record<string, never>;
        };
      };
    };
  };
  select: PublicEventTypeSelect;
  orderBy: ({ position: "desc" } | { id: "asc" })[];
};

const publicEventTypeQuery: PublicEventTypeQueryShape = {
  where: {
    hidden: false,
    teamId: null,
    users: {
      some: {
        username: {
          not: null,
        },
        profiles: {
          none: {},
        },
      },
    },
  },
  select: publicEventTypeSelect,
  orderBy: [{ position: "desc" }, { id: "asc" }],
} satisfies Prisma.EventTypeFindManyArgs;

type PublicEventTypeRow = Prisma.EventTypeGetPayload<{
  select: typeof publicEventTypeSelect;
}>;

type PublicEventTypeFinder = (query: PublicEventTypeQueryShape) => Promise<PublicEventTypeRow[]>;

const queryPublicEventTypes: PublicEventTypeFinder = (query: PublicEventTypeQueryShape) =>
  prisma.eventType.findMany(query);

const getPublicBookingDetails = (eventType: PublicEventTypeRow): { href: string; host: string } | null => {
  const host = eventType.users.find((user) => user.username);
  if (!host?.username) return null;

  let hostLabel = `@${host.username}`;
  if (host.name) {
    hostLabel = `${host.name} (@${host.username})`;
  }

  return {
    href: `/${encodeURIComponent(host.username)}/${encodeURIComponent(eventType.slug)}`,
    host: hostLabel,
  };
};

type PublicEventCatalogItem = {
  title: string;
  description: string | null;
  length: number;
  href: string;
  host: string;
};

export type PublicEventTypeQuery = typeof publicEventTypeQuery;

export async function getPublicEventCatalog(
  findEventTypes: PublicEventTypeFinder = queryPublicEventTypes
): Promise<PublicEventCatalogItem[]> {
  const eventTypes = await findEventTypes(publicEventTypeQuery);
  return eventTypes.flatMap((eventType) => {
    const bookingDetails = getPublicBookingDetails(eventType);
    if (!bookingDetails) return [];

    return [
      {
        title: eventType.title,
        description: eventType.description,
        length: eventType.length,
        ...bookingDetails,
      },
    ];
  });
}
