"use client";

import { AnimatePresence, motion } from "framer-motion";
import { LogOut, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useChatUiStore } from "@/lib/store/chatgpt-ui";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true" className="size-[18px]">
      <path
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.56 2.7-3.86 2.7-6.62Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.46-.8 5.94-2.18l-2.9-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.98v2.33A8.98 8.98 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.97 10.72A5.4 5.4 0 0 1 3.69 9c0-.6.1-1.18.28-1.72V4.95H.98A8.98 8.98 0 0 0 0 9c0 1.45.35 2.82.98 4.05l2.99-2.33Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.32 0 2.5.45 3.43 1.34l2.58-2.58C13.45.89 11.43 0 9 0A8.98 8.98 0 0 0 .98 4.95l2.99 2.33c.7-2.12 2.69-3.7 5.03-3.7Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function LoginButton() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const currentUser = useChatUiStore((state) => state.currentUser);
  const authStatus = useChatUiStore((state) => state.authStatus);
  const beginGoogleLogin = useChatUiStore((state) => state.beginGoogleLogin);
  const logout = useChatUiStore((state) => state.logout);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    function handlePointerDown(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);
    window.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, [open]);

  function handleGoogleLogin() {
    setOpen(false);
    beginGoogleLogin();
  }

  if (authStatus === "authenticated" && currentUser) {
    return (
      <div className="flex items-center gap-2">
        <div className="hidden rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-[13px] text-[var(--text-primary)] sm:block">
          {currentUser.name ?? currentUser.email}
        </div>
        <button
          type="button"
          onClick={logout}
          className="flex h-9 items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.025] px-3.5 text-[13px] font-medium tracking-[-0.01em] text-[var(--text-primary)] transition-colors duration-150 hover:bg-white/[0.05]"
        >
          <LogOut className="size-4" strokeWidth={2.2} />
          Keluar
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 items-center rounded-full border border-white/[0.07] bg-white/[0.025] px-3.5 text-[13px] font-medium tracking-[-0.01em] text-[var(--text-primary)] transition-colors duration-150 hover:bg-white/[0.05]"
      >
        {authStatus === "loading" ? "Memuat..." : "Log in"}
      </button>

      <AnimatePresence>
        {open ? (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                ref={panelRef}
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                className="w-full max-w-[25rem] rounded-[1.4rem] border border-white/[0.08] bg-[#2b2b2b] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
                role="dialog"
                aria-modal="true"
                aria-labelledby="login-title"
              >
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-white/45">
                      Account
                    </p>
                    <h2 id="login-title" className="mt-1 text-[24px] font-medium tracking-[-0.03em] text-white/95">
                      Masuk ke akun
                    </h2>
                    <p className="mt-1 text-[13px] leading-5 text-white/60">
                      Lanjutkan dengan akun Google untuk membuka sinkronisasi dan riwayat chat.
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Tutup dialog login"
                    onClick={() => setOpen(false)}
                    className="flex size-9 items-center justify-center rounded-full text-white/65 transition-colors duration-150 hover:bg-white/6 hover:text-white/90"
                  >
                    <X className="size-[17px]" strokeWidth={2.15} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-white/[0.08] bg-white px-4 text-[14px] font-medium tracking-[-0.01em] text-black transition-colors duration-150 hover:bg-white/90"
                >
                  <GoogleIcon />
                  <span>Lanjut dengan Google</span>
                </button>

                <p className="mt-4 text-center text-[11.5px] leading-5 tracking-[-0.01em] text-white/40">
                  Dengan melanjutkan, Anda akan diarahkan ke flow login Google yang akan diproses oleh backend.
                </p>
              </motion.div>
            </div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
