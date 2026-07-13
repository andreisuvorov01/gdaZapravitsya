"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  type BeforeInstallPromptEvent,
  downloadDesktopShortcut,
  isIos,
  isMobileViewport,
  isStandalone,
} from "@/lib/install";
import {
  CHIP_AFTER_MS,
  IDLE_MS,
  INSTALL_DISMISS_KEY,
  LONG_SESSION_MS,
  SESSION_MIN_MS,
  wasInstallDismissedRecently,
} from "@/lib/installPrompt";
import { channelBlocksInstallThisSession } from "@/lib/channelPrompt";
import { isOnboardingComplete } from "@/lib/onboarding";
import { writeTimestamp } from "@/lib/clientStorage";

export type InstallBannerVariant = "default" | "leave";

type InstallPromptContextValue = {
  eligible: boolean;
  showBanner: boolean;
  showChip: boolean;
  mobile: boolean;
  installSteps: boolean;
  bannerVariant: InstallBannerVariant;
  openBanner: () => void;
  dismiss: () => void;
  runInstall: () => Promise<void>;
};

const InstallPromptContext = createContext<InstallPromptContextValue | null>(null);

export function useInstallPrompt(): InstallPromptContextValue {
  const ctx = useContext(InstallPromptContext);
  if (!ctx) {
    throw new Error("useInstallPrompt вне InstallPromptProvider");
  }
  return ctx;
}

/** Провайдер: отслеживает время, простой и exit-intent для PWA-подсказки. */
export function InstallPromptProvider({ children }: { children: ReactNode }) {
  const [eligible, setEligible] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showChip, setShowChip] = useState(false);
  const [installSteps, setInstallSteps] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [mobile, setMobile] = useState(false);
  const [bannerVariant, setBannerVariant] =
    useState<InstallBannerVariant>("default");

  const sessionStart = useRef(Date.now());
  const lastActivity = useRef(Date.now());
  const bannerTriggered = useRef(false);
  const exitIntentUsed = useRef(false);
  const leavePending = useRef(false);

  const dismiss = useCallback(() => {
    writeTimestamp(INSTALL_DISMISS_KEY);
    setShowBanner(false);
    setShowChip(false);
    setInstallSteps(false);
  }, []);

  const openBanner = useCallback(() => {
    if (!eligible || isStandalone() || wasInstallDismissedRecently()) return;
    bannerTriggered.current = true;
    setShowBanner(true);
  }, [eligible]);

  const runInstall = useCallback(async () => {
    if (installSteps) {
      dismiss();
      return;
    }
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") {
        dismiss();
        return;
      }
    }
    if (isIos() || mobile) {
      setInstallSteps(true);
      return;
    }
    downloadDesktopShortcut();
    dismiss();
  }, [deferred, dismiss, installSteps, mobile]);

  useEffect(() => {
    setMobile(isMobileViewport());
    const onResize = () => setMobile(isMobileViewport());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const canShow = !isStandalone() && !wasInstallDismissedRecently();
    setEligible(canShow);
    if (!canShow) return;

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setDeferred(null);

    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Ждём закрытия онбординга.
  useEffect(() => {
    if (!eligible) return;
    if (isOnboardingComplete()) {
      setOnboardingDone(true);
      return;
    }
    const poll = setInterval(() => {
      if (isOnboardingComplete()) {
        setOnboardingDone(true);
        clearInterval(poll);
      }
    }, 300);
    return () => clearInterval(poll);
  }, [eligible]);

  // Триггеры: долго на сайте, простой, exit-intent.
  useEffect(() => {
    if (!eligible || !onboardingDone) return;

    sessionStart.current = Date.now();
    lastActivity.current = Date.now();

    const markActivity = () => {
      lastActivity.current = Date.now();
    };

    const activityEvents = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "pointerdown",
      "click",
    ] as const;

    for (const event of activityEvents) {
      window.addEventListener(event, markActivity, { passive: true });
    }

    const tryOpenBanner = (variant: InstallBannerVariant = "default") => {
      if (
        bannerTriggered.current ||
        wasInstallDismissedRecently() ||
        isStandalone() ||
        channelBlocksInstallThisSession()
      ) {
        return;
      }
      bannerTriggered.current = true;
      setBannerVariant(variant);
      setShowBanner(true);
    };

    const tick = window.setInterval(() => {
      if (
        bannerTriggered.current ||
        wasInstallDismissedRecently() ||
        channelBlocksInstallThisSession()
      ) {
        return;
      }

      const now = Date.now();
      const sessionAge = now - sessionStart.current;
      const idleFor = now - lastActivity.current;

      if (sessionAge >= CHIP_AFTER_MS) {
        setShowChip(true);
      }

      if (sessionAge < SESSION_MIN_MS) return;

      if (sessionAge >= LONG_SESSION_MS || idleFor >= IDLE_MS) {
        tryOpenBanner("default");
      }
    }, 2000);

    // Exit-intent: курсор уходит вверх за пределы окна (десктоп).
    const onMouseLeave = (e: MouseEvent) => {
      if (
        exitIntentUsed.current ||
        bannerTriggered.current ||
        isMobileViewport() ||
        e.clientY > 12 ||
        channelBlocksInstallThisSession()
      ) {
        return;
      }
      if (Date.now() - sessionStart.current < SESSION_MIN_MS) return;
      exitIntentUsed.current = true;
      tryOpenBanner("leave");
    };

    // Мобильный «уход»: при сворачивании вкладки — показ при возврате.
    const onVisibility = () => {
      if (!isMobileViewport()) return;
      if (document.visibilityState === "hidden") {
        if (
          Date.now() - sessionStart.current >= SESSION_MIN_MS &&
          !bannerTriggered.current
        ) {
          leavePending.current = true;
        }
        return;
      }
      if (
        document.visibilityState === "visible" &&
        leavePending.current &&
        !bannerTriggered.current &&
        !wasInstallDismissedRecently() &&
        !channelBlocksInstallThisSession()
      ) {
        leavePending.current = false;
        exitIntentUsed.current = true;
        tryOpenBanner("leave");
      }
    };

    document.documentElement.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(tick);
      document.documentElement.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      for (const event of activityEvents) {
        window.removeEventListener(event, markActivity);
      }
    };
  }, [eligible, onboardingDone]);

  const value: InstallPromptContextValue = {
    eligible,
    showBanner,
    showChip: eligible && showChip && !showBanner,
    mobile,
    installSteps,
    bannerVariant,
    openBanner,
    dismiss,
    runInstall,
  };

  return (
    <InstallPromptContext.Provider value={value}>{children}</InstallPromptContext.Provider>
  );
}
