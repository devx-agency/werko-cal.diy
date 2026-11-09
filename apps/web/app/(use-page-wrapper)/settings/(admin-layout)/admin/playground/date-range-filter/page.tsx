import { requireAdminPage } from "app/_lib/pageAuthorization";
import DateRangeFilterPlayground from "./DateRangeFilterPlayground";

export default async function Page() {
  await requireAdminPage("/settings/admin/playground/date-range-filter");

  return <DateRangeFilterPlayground />;
}
