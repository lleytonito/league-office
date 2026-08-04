import { castProposalVote } from "@/lib/proposals/cast-vote";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const voteRequestSchema = z.object({
  optionId: z.string().uuid(),
  proposalId: z.string().uuid(),
});

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return voteResponse({ message: "Vote request was not valid JSON.", ok: false }, 400);
  }

  const parsed = voteRequestSchema.safeParse(body);
  if (!parsed.success) {
    return voteResponse({ message: "Choose a voting option.", ok: false }, 400);
  }

  const supabase = await createClient();
  const result = await castProposalVote(supabase, parsed.data.proposalId, parsed.data.optionId);

  if (!result.ok) {
    return voteResponse(result, result.message.includes("Sign in") ? 401 : 400);
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return voteResponse(result, 200);
}

function voteResponse(body: { message: string; ok: boolean }, status: number) {
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "no-store",
    },
    status,
  });
}
