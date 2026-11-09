import { AppCategories } from "@calcom/prisma/enums";
import { getStaticProps } from "@lib/apps/categories/[category]/getStaticProps";
import { createLocalPath, requireAuthenticatedPage } from "app/_lib/pageAuthorization";
import type { PageProps } from "app/_types";
import { redirect } from "next/navigation";
import { z } from "zod";
import CategoryPage from "~/apps/categories/[category]/category-view";

const querySchema = z.object({
  category: z.enum(Object.values(AppCategories) as [AppCategories, ...AppCategories[]]),
});

async function Page({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  await requireAuthenticatedPage(
    createLocalPath(
      `/apps/categories/${encodeURIComponent(`${resolvedParams.category}`)}`,
      resolvedSearchParams
    )
  );
  const parsed = querySchema.safeParse({ ...resolvedParams, ...resolvedSearchParams });
  if (!parsed.success) {
    redirect("/apps/categories/calendar");
  }

  const props = await getStaticProps(parsed.data.category);

  return <CategoryPage {...props} />;
}

export default Page;
