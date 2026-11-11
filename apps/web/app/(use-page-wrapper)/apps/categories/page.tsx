import { getServerSideProps } from "@lib/apps/categories/getServerSideProps";
import { buildLegacyCtxFromNextRequest } from "@lib/buildLegacyCtx";
import { createLocalPath, requireAuthenticatedPage } from "app/_lib/pageAuthorization";
import type { PageProps } from "app/_types";
import { withAppDirSsr } from "app/WithAppDirSsr";
import Page from "~/apps/categories/categories-view";

const getData = withAppDirSsr(getServerSideProps);

async function ServerPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  await requireAuthenticatedPage(createLocalPath("/apps/categories", resolvedSearchParams));
  const props = await getData(
    await buildLegacyCtxFromNextRequest(resolvedParams, resolvedSearchParams)
  );

  return <Page {...props} />;
}

export default ServerPage;
