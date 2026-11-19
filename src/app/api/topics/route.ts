import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { title?: string; description?: string; period?: string; startDate?: string; endDate?: string };
    const title = String(body.title ?? "").trim();
    const description = String(body.description ?? "").trim();
    const period = body.period || "all";
    if (!title) return NextResponse.json({ ok: false, error: "Add a topic title." }, { status: 400 });
    if (title.length > 120) return NextResponse.json({ ok: false, error: "Topic titles must be 120 characters or fewer." }, { status: 400 });
    if (description.length > 280) return NextResponse.json({ ok: false, error: "Descriptions must be 280 characters or fewer." }, { status: 400 });

    let startAt: string | null = null;
    let endAt: string | null = null;
    const now = new Date();
    if (period === "7d" || period === "30d") {
      const days = period === "7d" ? 7 : 30;
      startAt = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
      endAt = now.toISOString();
    } else if (period === "custom") {
      if (!body.startDate || !body.endDate) return NextResponse.json({ ok: false, error: "Choose both custom period dates." }, { status: 400 });
      const start = new Date(`${body.startDate}T00:00:00.000Z`);
      const end = new Date(`${body.endDate}T23:59:59.999Z`);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return NextResponse.json({ ok: false, error: "Choose a valid message time period." }, { status: 400 });
      startAt = start.toISOString();
      endAt = end.toISOString();
    } else if (period !== "all") {
      return NextResponse.json({ ok: false, error: "Choose a valid message time period." }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Please sign in before creating a topic." }, { status: 401 });

    const { data, error } = await supabase.from("topics").insert({ owner_id: user.id, name: title, description: description || null, start_at: startAt, end_at: endAt, selection_status: "manual" }).select("id, name, description, start_at, end_at, created_at").single();
    if (error || !data) return NextResponse.json({ ok: false, error: error?.message ?? "The topic could not be created." }, { status: 400 });

    revalidatePath("/topics");
    return NextResponse.json({ ok: true, topic: data });
  } catch (error) {
    console.error("POST /api/topics failed", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "The topic could not be created." }, { status: 500 });
  }
}
