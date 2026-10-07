import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const setSchema = z.object({
  name: z.string().min(1, "Name is required"),
  intervals: z.array(z.number().positive()).min(1, "At least 1 interval required"),
  isDefault: z.boolean().optional().default(false),
});

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const dbSets = await prisma.revisionSet.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });

    const revisionSets = dbSets.map((s: any) => {
      let parsedIntervals: number[] = [1, 7, 30];
      if (typeof s.intervals === "string") {
        try {
          parsedIntervals = JSON.parse(s.intervals);
        } catch (e) {
          parsedIntervals = [1, 7, 30];
        }
      } else if (Array.isArray(s.intervals)) {
        parsedIntervals = s.intervals;
      }
      return {
        ...s,
        intervals: parsedIntervals,
      };
    });

    return NextResponse.json({ revisionSets });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to fetch revision sets" } }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const body = await req.json();
    const result = setSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid intervals or name" } }, { status: 400 });
    }

    if (result.data.isDefault) {
      await prisma.revisionSet.updateMany({
        where: { userId: user.id },
        data: { isDefault: false },
      });
    }

    const intervalsString = JSON.stringify(result.data.intervals);

    const revisionSet = await prisma.revisionSet.create({
      data: {
        userId: user.id,
        name: result.data.name,
        intervals: intervalsString,
        isDefault: result.data.isDefault,
      },
    });

    return NextResponse.json(
      {
        revisionSet: {
          ...revisionSet,
          intervals: result.data.intervals,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to create revision set" } }, { status: 500 });
  }
}
