import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { email: body.data.email.toLowerCase() } });
  if (!user || !(await verifyPassword(body.data.password, user.passwordHash))) {
    return NextResponse.json({ error: "Email or password is incorrect" }, { status: 401 });
  }
  await createSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    organizationId: user.organizationId,
  });
  return NextResponse.json({ ok: true });
}
