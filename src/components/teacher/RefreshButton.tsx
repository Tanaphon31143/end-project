"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, RefreshCw } from "lucide-react";
export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      className="button ghost"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      {pending ? (
        <LoaderCircle className="spin" size={16} />
      ) : (
        <RefreshCw size={16} />
      )}{" "}
      {pending ? "กำลังรีเฟรช" : "รีเฟรชข้อมูล"}
    </button>
  );
}
