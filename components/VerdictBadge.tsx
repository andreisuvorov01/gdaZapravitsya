"use client";

import { VERDICT_HEX, type Verdict } from "@/lib/freshness";

/** Единый вердикт доверия — заменяет разрозненные технические метрики в шапке карточки. */
export default function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return (
    <div
      className="verdict-badge"
      style={{
        borderColor: `${VERDICT_HEX[verdict.level]}40`,
        background: `${VERDICT_HEX[verdict.level]}14`,
      }}
    >
      <p className="verdict-badge__title" style={{ color: VERDICT_HEX[verdict.level] }}>
        {verdict.title}
      </p>
      <p className="verdict-badge__subtitle">{verdict.subtitle}</p>
    </div>
  );
}
