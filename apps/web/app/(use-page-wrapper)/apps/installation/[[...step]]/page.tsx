import { getServerSideProps } from "@lib/apps/installation/[[...step]]/getServerSideProps";
import { buildLegacyCtxFromNextRequest } from "@lib/buildLegacyCtx";
import { createLocalPath, requireAuthenticatedPage } from "app/_lib/pageAuthorization";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { withAppDirSsr } from "app/WithAppDirSsr";
import type { OnboardingPageProps } from "~/apps/installation/[[...step]]/step-view";
import Page from "~/apps/installation/[[...step]]/step-view";

export const generateMetadata = async ({ params }: PageProps) => {
  const stepParam = (await params).step;
  const step = stepParam && Array.isArray(stepParam) ? stepParam.join("/") : "";
  await requireAuthenticatedPage(`/apps/installation${step ? `/${step}` : ""}`);
  return await _generateMetadata(
    (t) => t("app_installation"),
    () => "",
    undefined,
    undefined,
    `/apps/installation${step ? `/${step}` : ""}`
  );
};

const getData = withAppDirSsr<OnboardingPageProps>(getServerSideProps);

const ServerPage = async ({ params, searchParams }: PageProps) => {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const step = Array.isArray(resolvedParams.step) ? resolvedParams.step.join("/") : "";
  await requireAuthenticatedPage(
    createLocalPath(`/apps/installation${step ? `/${step}` : ""}`, resolvedSearchParams)
  );
  const props = await getData(
    await buildLegacyCtxFromNextRequest(resolvedParams, resolvedSearchParams)
  );
  return <Page {...props} />;
};
export default ServerPage;
