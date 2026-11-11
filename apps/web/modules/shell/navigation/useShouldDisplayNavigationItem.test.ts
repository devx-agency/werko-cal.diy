import { UserPermissionRole } from "@calcom/prisma/enums";
import { describe, expect, it } from "vitest";
import { isNavigationItemAvailableForRole } from "./useShouldDisplayNavigationItem";

describe("isNavigationItemAvailableForRole", () => {
  it("hides event-type creation from guests and regular users", () => {
    for (const role of [undefined, UserPermissionRole.USER]) {
      expect(isNavigationItemAvailableForRole("event_types_page_title", role)).toBe(false);
      expect(isNavigationItemAvailableForRole("bookings", role)).toBe(true);
    }
  });

  it("shows event-type management to admins", () => {
    expect(isNavigationItemAvailableForRole("event_types_page_title", UserPermissionRole.ADMIN)).toBe(true);
  });
});
