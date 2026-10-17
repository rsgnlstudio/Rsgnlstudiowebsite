import { describe, expect, it, vi } from "vitest";
import { siteDocuments } from "@/content/data";
import { handleWebhook } from "@/sanity/revalidate";

const run = (isValidSignature: boolean | null, content = siteDocuments) => {
  const revalidate = vi.fn();
  return handleWebhook({ isValidSignature, fetchContent: async () => content, revalidate }).then((result) => ({ result, revalidate }));
};

describe("handleWebhook", () => {
  it("rejects a missing or wrong signature", async () => {
    for (const signature of [false, null]) {
      const { result, revalidate } = await run(signature);
      expect(result.status).toBe(401);
      expect(revalidate).not.toHaveBeenCalled();
    }
  });
  it("keeps the last good content when the published content is incomplete", async () => {
    const broken = {
      ...siteDocuments,
      consulting: { ...siteDocuments.consulting, challenges: siteDocuments.consulting.challenges.filter((c) => c.id !== "owner") },
    };
    const { result, revalidate } = await run(true, broken);
    expect(result.status).toBe(422);
    expect(result.problems).toContain('consulting.challenges: missing "owner"');
    expect(revalidate).not.toHaveBeenCalled();
  });
  it("refreshes the site for complete content", async () => {
    const { result, revalidate } = await run(true);
    expect(result.status).toBe(200);
    expect(revalidate).toHaveBeenCalledTimes(1);
  });
});
