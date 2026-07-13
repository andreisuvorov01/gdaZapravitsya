/** Вызов Ya.Context.AdvManager.render с ожиданием layout и context.js. */

type RtbRenderOpts = {
  blockId: string;
  renderTo: string;
  darkTheme?: boolean;
};

declare global {
  interface Window {
    yaContextCb?: Array<() => void>;
    Ya?: {
      Context?: {
        AdvManager?: {
          render: (opts: RtbRenderOpts) => void;
        };
      };
    };
  }
}

function renderNow(opts: RtbRenderOpts): void {
  const el = document.getElementById(opts.renderTo);
  const adv = window.Ya?.Context?.AdvManager;
  if (!el || !adv) return;

  adv.render({
    blockId: opts.blockId,
    renderTo: opts.renderTo,
    darkTheme: opts.darkTheme ?? true,
  });
}

/** Ставит render в очередь context.js или вызывает сразу после layout. */
export function scheduleYandexRtbRender(opts: RtbRenderOpts): void {
  const attempt = () => requestAnimationFrame(() => renderNow(opts));

  if (window.Ya?.Context?.AdvManager) {
    attempt();
    return;
  }

  window.yaContextCb = window.yaContextCb || [];
  window.yaContextCb.push(attempt);
}
