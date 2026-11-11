import { getTranslate } from "app/_utils";

export default async function Forbidden() {
  const t = await getTranslate();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-semibold text-3xl text-emphasis">403</h1>
      <p className="mt-2 text-subtle">{t("access_denied")}</p>
    </main>
  );
}
