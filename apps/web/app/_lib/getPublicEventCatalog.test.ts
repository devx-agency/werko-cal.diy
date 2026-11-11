import { afterEach, describe, expect, it, vi } from "vitest";
import { getPublicEventCatalog, type PublicEventTypeQuery } from "./getPublicEventCatalog";

const publicEventTypeQuery: PublicEventTypeQuery = {
  where: {
    hidden: false,
    teamId: null,
    users: {
      some: {
        username: { not: null },
        profiles: { none: {} },
      },
    },
  },
  select: {
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
  },
  orderBy: [{ position: "desc" }, { id: "asc" }],
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("getPublicEventCatalog", () => {
  it("returns only display fields and links to an existing public booking page", async () => {
    const personalEvent = {
      title: "Consultation",
      description: "A public event",
      length: 30,
      slug: "consultation",
      users: [{ name: "Jane Doe", username: "jane" }],
    };

    const findEventTypes = vi.fn(async () => [personalEvent]);

    await expect(getPublicEventCatalog(findEventTypes)).resolves.toEqual([
      {
        title: "Consultation",
        description: "A public event",
        length: 30,
        href: "/jane/consultation",
        host: "Jane Doe (@jane)",
      },
    ]);

    expect(findEventTypes).toHaveBeenCalledWith(publicEventTypeQuery);
  });

  it("returns an empty list when there are no public events", async () => {
    const findEventTypes = vi.fn(async () => []);

    await expect(getPublicEventCatalog(findEventTypes)).resolves.toEqual([]);
  });

  it("does not return an event that has no usable public booking URL", async () => {
    const eventWithoutBookingPage = {
      title: "Unroutable event",
      description: null,
      length: 30,
      slug: "unroutable",
      users: [{ name: null, username: null }],
    };
    const findEventTypes = vi.fn(async () => [eventWithoutBookingPage]);

    await expect(getPublicEventCatalog(findEventTypes)).resolves.toEqual([]);
  });
});
