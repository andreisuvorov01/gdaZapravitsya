import { isValidIndexNowKey } from "@/lib/indexnow";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ key: string }> };

/** Файл верификации IndexNow: /{INDEXNOW_KEY}.txt */
export async function GET(_req: Request, { params }: Props) {
  const { key } = await params;
  if (!isValidIndexNowKey(key)) {
    return new Response("Not Found", { status: 404 });
  }
  return new Response(key, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
