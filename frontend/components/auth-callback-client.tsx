"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useChatUiStore } from "@/lib/store/chatgpt-ui";

type AuthCallbackClientProps = {
  error?: string;
};

export function AuthCallbackClient({ error }: AuthCallbackClientProps) {
  const router = useRouter();
  const completeGoogleLogin = useChatUiStore((state) => state.completeGoogleLogin);
  const [message, setMessage] = useState("Menyelesaikan login Google...");

  useEffect(() => {
    async function finishLogin() {
      if (error) {
        setMessage("Login Google gagal. Silakan coba lagi.");
        return;
      }

      try {
        await completeGoogleLogin();
        router.replace("/");
      } catch {
        setMessage("Sesi login tidak tersedia. Periksa cookie dan konfigurasi backend.");
      }
    }

    void finishLogin();
  }, [completeGoogleLogin, error, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#202123] px-6 text-center text-white">
      <div className="max-w-sm rounded-[1.4rem] border border-white/10 bg-white/5 px-6 py-8">
        <p className="text-sm leading-6 text-white/76">{message}</p>
      </div>
    </main>
  );
}
