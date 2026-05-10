// ============================================================
// One-shot session flag set when the user finishes onboarding,
// consumed by MainTabs on its first mount to auto-navigate to
// the AestheticQuiz. Exists in module scope (process-local), so
// it doesn't survive an app restart — that's intentional: only
// new-from-onboarding users see the auto-prompt; returning users
// reach the quiz via the YouScreen banner instead.
// ============================================================

let _pending = false;

export const postOnboardingFlag = {
  setPending(): void {
    _pending = true;
  },
  consume(): boolean {
    const v = _pending;
    _pending = false;
    return v;
  },
};
