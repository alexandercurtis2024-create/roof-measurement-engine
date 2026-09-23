import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Button, Card, Field, Input } from "@/components/ui";

export default async function SettingsPage() {
  const user = await requireUser();
  if (!user) redirect("/login");
  const settings = await prisma.organizationSetting.findUnique({ where: { organizationId: user.organizationId } });
  async function save(formData: FormData) {
    "use server";
    const session = await requireUser();
    if (!session) return;
    await prisma.organizationSetting.upsert({
      where: { organizationId: session.organizationId },
      update: {
        companyName: String(formData.get("companyName") || ""),
        wasteFactorDefault: Number(formData.get("waste") || 12) / 100,
        shingleBundlesPerSq: Number(formData.get("bundles") || 3),
      },
      create: { organizationId: session.organizationId, companyName: String(formData.get("companyName") || "") },
    });
  }
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Contractor settings</h1>
      <Card className="p-4">
        <form action={save} className="space-y-3">
          <Field label="Company name"><Input name="companyName" defaultValue={settings?.companyName ?? ""} /></Field>
          <Field label="Default waste %"><Input name="waste" defaultValue={String(Math.round((settings?.wasteFactorDefault ?? 0.12) * 100))} /></Field>
          <Field label="Shingle bundles / square"><Input name="bundles" defaultValue={String(settings?.shingleBundlesPerSq ?? 3)} /></Field>
          <Button type="submit" className="w-full">Save</Button>
        </form>
      </Card>
    </div>
  );
}
