import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { headers } from "next/headers";

import { buildLegacyCtxFromNextRequest } from "@lib/buildLegacyCtx";

import Logout from "~/auth/logout-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("logged_out"),
    (t) => t("youve_been_logged_out"),
    undefined,
    undefined,
    "/auth/logout"
  );
};

const Page = async ({ params, searchParams }: PageProps) => {
  // cookie will be cleared in `/apps/web/proxy.ts`
  const h = await headers();
  const context = await buildLegacyCtxFromNextRequest(params, searchParams, h);

  return <Logout query={context.query} />;
};

export default Page;
