import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  company: z.string().max(120).optional().nullable(),
});

export async function POST(req: Request) {
  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const existing = await prisma.user.findUnique({ where: { email: body.data.email.toLowerCase() } });
  if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  const org = await prisma.organization.create({
    data: { name: body.data.company || `${body.data.name}'s company` },
  });
  await prisma.organizationSetting.create({
    data: { organizationId: org.id, companyName: body.data.company || body.data.name },
  });
  const user = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: body.data.email.toLowerCase(),
      name: body.data.name,
      passwordHash: await hashPassword(body.data.password),
      role: "contractor",
    },
  });
  await createSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    organizationId: user.organizationId,
  });
  return NextResponse.json({ ok: true });
}
