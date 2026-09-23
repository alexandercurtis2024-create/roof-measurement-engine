import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const project = await prisma.project.findFirst({
    where: { id, organizationId: user.organizationId },
    include: { property: true, measurements: true, roofModel: true, organization: { include: { settings: true } } },
  });
  if (!project?.property) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let y = 752;
  const draw = (text: string, size = 11, b = false) => {
    page.drawText(text.slice(0, 110), { x: 48, y, size, font: b ? bold : font, color: rgb(0.08, 0.1, 0.13) });
    y -= size + 6;
  };
  draw("ROOF MEASUREMENT ENGINE", 10, true);
  draw(project.property.normalizedAddress, 16, true);
  draw(`${project.organization.settings?.companyName || project.organization.name}  ·  Engine ${project.algorithmVersion}`);
  y -= 8;
  draw("Measurements", 13, true);
  for (const m of project.measurements) {
    draw(`${m.label}: ${m.display}  [${m.origin} / ${m.confidence}]`, 10);
    if (y < 80) break;
  }
  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="roof-report-${id}.pdf"` },
  });
}
