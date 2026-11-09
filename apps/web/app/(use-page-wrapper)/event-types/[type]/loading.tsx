import { requireAdminPage } from "app/_lib/pageAuthorization";
import type { ReactNode } from "react";
import { EventTypeEditPageSkeleton } from "./skeleton";

export default async function Loading(): Promise<ReactNode> {
  await requireAdminPage("/event-types");

  return <EventTypeEditPageSkeleton />;
}
