import type { FaqItem } from "@/lib/faq";

// Список вопросов-ответов на нативных <details> (работает без JS — важно для SEO).
export default function FaqList({ items }: { items: FaqItem[] }) {
  return (
    <div className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-surface/60">
      {items.map((it, i) => (
        <details key={i} className="group" {...(i === 0 ? { open: true } : {})}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-base font-semibold text-ink transition hover:bg-white/5">
            <span>{it.question}</span>
            <svg
              className="h-5 w-5 shrink-0 text-ink-muted transition-transform group-open:rotate-180"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </summary>
          <div className="px-5 pb-5 text-sm leading-relaxed text-ink-muted">
            {it.answer}
          </div>
        </details>
      ))}
    </div>
  );
}
