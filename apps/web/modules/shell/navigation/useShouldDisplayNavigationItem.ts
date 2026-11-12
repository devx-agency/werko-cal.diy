import { useFlagMap } from "@calcom/features/flags/context/provider";
import { isKeyInObject } from "@calcom/lib/isKeyInObject";
import { UserPermissionRole } from "@calcom/prisma/enums";
import { useSession } from "next-auth/react";
import type { NavigationItemType } from "./NavigationItem";

export const isNavigationItemAvailableForRole = (itemName: string, role?: UserPermissionRole): boolean => {
  if (itemName !== "event_types_page_title") return true;
  return role === UserPermissionRole.ADMIN;
};

export function useShouldDisplayNavigationItem(item: NavigationItemType): boolean {
  const flags = useFlagMap();
  const { data: session } = useSession();

  if (!isNavigationItemAvailableForRole(item.name, session?.user?.role)) return false;
  if (isKeyInObject(item.name, flags)) return flags[item.name];
  return true;
}
