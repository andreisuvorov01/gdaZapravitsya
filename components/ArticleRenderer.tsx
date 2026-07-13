import Link from "next/link";
import Image from "next/image";
import type { ArticleBlock, InlinePart } from "@/lib/articles/types";
import { ArticleCta } from "@/components/ArticleCta";

function RenderParts({ parts }: { parts: InlinePart[] }) {
  return parts.map((part, i) =>
    typeof part === "string" ? (
      <span key={i}>{part}</span>
    ) : (
      <Link key={i} href={part.href} className="text-brand-fuel underline">
        {part.children}
      </Link>
    )
  );
}

export default function ArticleRenderer({ blocks }: { blocks: ArticleBlock[] }) {
  return (
    <div className="article-prose">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "p":
            return (
              <p
                key={i}
                className={`${i === 0 || block.lead ? "text-lg" : ""} mt-4 leading-relaxed text-ink-muted ${i === 0 ? "mt-0" : ""}`}
              >
                <RenderParts parts={block.parts} />
              </p>
            );
          case "h2":
            return (
              <h2 key={i} className="mt-10 text-2xl font-bold text-ink">
                {block.text}
              </h2>
            );
          case "h3":
            return (
              <h3 key={i} className="mt-6 text-lg font-semibold text-ink">
                {block.text}
              </h3>
            );
          case "ul":
            return (
              <ul key={i} className="mt-4 list-disc space-y-2 pl-5 leading-relaxed text-ink-muted">
                {block.items.map((items, j) => (
                  <li key={j}>
                    <RenderParts parts={items} />
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i} className="mt-4 list-decimal space-y-2 pl-5 leading-relaxed text-ink-muted">
                {block.items.map((items, j) => (
                  <li key={j}>
                    <RenderParts parts={items} />
                  </li>
                ))}
              </ol>
            );
          case "cta":
            return (
              <ArticleCta
                key={i}
                title={block.title}
                text={block.text}
                primaryLabel={block.primaryLabel}
                primaryHref={block.primaryHref}
                secondaryLabel={block.secondaryLabel}
                secondaryHref={block.secondaryHref}
              />
            );
          case "figure":
            return (
              <figure
                key={i}
                className="my-8 overflow-hidden rounded-2xl border border-white/10 bg-surface/40"
              >
                <Image
                  src={block.src}
                  alt={block.alt}
                  width={1280}
                  height={720}
                  className="h-auto w-full object-cover"
                  priority={i < 2}
                />
                {block.caption && (
                  <figcaption className="px-4 py-3 text-xs leading-relaxed text-ink-muted">
                    {block.caption}
                  </figcaption>
                )}
              </figure>
            );
          case "blockquote":
            return (
              <blockquote
                key={i}
                className="my-8 border-l-4 border-brand-fuel/50 pl-4 text-sm italic leading-relaxed text-ink-muted"
              >
                <RenderParts parts={block.parts} />
              </blockquote>
            );
          case "table":
            return (
              <div key={i} className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="bg-white/5 text-ink">
                    <tr>
                      <th className="px-4 py-3 font-semibold">{block.headers[0]}</th>
                      <th className="px-4 py-3 font-semibold">{block.headers[1]}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 text-ink-muted">
                    {block.rows.map(([a, b], j) => (
                      <tr key={j}>
                        <td className="px-4 py-3 font-medium text-ink">{a}</td>
                        <td className="px-4 py-3">{b}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
