import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/LegalPage";
import { getLegalPage, getSiteContent } from "@/content";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getLegalPage("imprint")).metaTitle };
}

export default async function ImprintPage() {
  const [page, { ui }] = await Promise.all([getLegalPage("imprint"), getSiteContent()]);
  return <LegalPage page={page} back={ui.back} />;
}
