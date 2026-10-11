import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateCellSchema = z.object({
  rowId: z.string().min(1, "Row ID is required"),
  columnId: z.string().min(1, "Column ID is required"),
  value: z.string().max(500, "Cell value cannot exceed 500 characters").optional().default(""),
});

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const body = await req.json();
    const result = updateCellSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid cell fields" } },
        { status: 400 }
      );
    }

    const { rowId, columnId, value } = result.data;

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
