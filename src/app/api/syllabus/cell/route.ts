import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyUserSync } from "@/lib/sse";

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const body = await req.json();
    const { rowId, columnId, value } = body;

    const cell = await prisma.syllabusCell.upsert({
      where: { rowId_columnId: { rowId, columnId } },
      create: {
        rowId,
        columnId,
        value: value || "",
      },
      update: {
        value: value || "",
      },
    });

    return NextResponse.json({ cell });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to update cell" } }, { status: 500 });
  }
}
