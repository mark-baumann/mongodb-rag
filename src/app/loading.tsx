"use client";

import { ClipLoader } from "react-spinners";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70">
      <div className="flex flex-col items-center gap-4">
        <ClipLoader size={48} color="#059669" />
        <p className="text-sm text-emerald-700">Lädt…</p>
      </div>
    </div>
  );
}

