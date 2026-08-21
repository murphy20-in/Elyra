"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  X,
  MapPin,
  Sparkles,
  LogOut,
  Loader2,
  HeartCrack,
} from "lucide-react";
import toast from "react-hot-toast";

import { api, getToken, clearTokens } from "@/lib/api";

interface Candidate {
  user_id: string;
  display_name: string;
  age: number;
  gender_identity: string;
  sexual_orientation: string;
  bio?: string | null;
  city?: string | null;
  intent?: string | null;
  profile_photo_url?: string | null;
  distance_km?: number | null;
  compatibility_score: number;
}

interface DiscoverResponse {
  candidates: Candidate[];
  page: number;
  total: number;
  has_more: boolean;
}

const INTENT_EMOJI: Record<string, string> = {
  exploring: "✨",
  serious: "💜",
  discreet: "🤫",
  friendship: "🤝",
};

function Avatar({ name }: { name: string }) {
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <div className="w-full aspect-[4/5] rounded-2xl bg-gradient-to-br from-primary-400 via-primary-600 to-secondary-500 flex items-center justify-center">
      <span className="text-7xl font-bold text-white/90 drop-shadow">{initials}</span>
    </div>
  );
}

export default function DiscoverPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [matchWith, setMatchWith] = useState<string | null>(null);
  const [exhausted, setExhausted] = useState(false);

  const loadPage = useCallback(
    async (p: number) => {
      setLoading(true);
      try {
        const res = await api.get<DiscoverResponse>(
          `/matches/discover?page=${p}&per_page=10`
        );
        if (res.candidates.length === 0 && p === 1) setExhausted(true);
        setCandidates((prev) => [...prev, ...res.candidates]);
        setHasMore(res.has_more);
        setPage(p);
      } catch (err) {
        if (getToken()) toast.error("Could not load candidates");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!getToken()) {
      router.replace("/auth/login");
      return;
    }
    loadPage(1);
  }, [loadPage, router]);

  async function act(kind: "like" | "pass") {
    const current = candidates[0];
    if (!current || acting) return;
    setActing(true);
    try {
      if (kind === "like") {
        const res = await api.post<{ matched: boolean; match_id: string | null }>(
          `/matches/like/${current.user_id}`
        );
        if (res.matched) setMatchWith(current.display_name);
        else toast.success(`Liked ${current.display_name}`);
      } else {
        await api.post(`/matches/pass/${current.user_id}`);
      }
      setCandidates((prev) => prev.slice(1));
      if (candidates.length === 1 && hasMore) loadPage(page + 1);
      if (candidates.length === 1 && !hasMore) setExhausted(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setActing(false);
    }
  }

  function handleLogout() {
    clearTokens();
    router.push("/");
  }

  const current = candidates[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <header className="max-w-md mx-auto flex items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2">
          <Heart className="w-6 h-6 text-primary-600" fill="currentColor" />
          <span className="text-xl font-bold text-primary-600">Elyra</span>
        </Link>
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
        >
          <LogOut className="w-4 h-4" /> Log out
        </button>
      </header>

      <main className="max-w-md mx-auto px-4 pb-10">
        {loading && candidates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40 gap-3 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            Finding people near you…
          </div>
        ) : current && !exhausted ? (
          <>
            <div className="relative">
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={current.user_id}
                  initial={{ scale: 0.95, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{
                    x: -300,
                    rotate: -12,
                    opacity: 0,
                    transition: { duration: 0.25 },
                  }}
                  className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden"
                >
                  <Avatar name={current.display_name} />
                  <div className="p-5">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold text-gray-900">
                        {current.display_name}, {current.age}
                      </h2>
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-sm font-medium">
                        <Sparkles className="w-3.5 h-3.5" />
                        {Math.round(current.compatibility_score * 100)}%
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-gray-500">
                      {current.city && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" /> {current.city}
                        </span>
                      )}
                      {current.intent && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-pink-50 text-pink-600">
                          {INTENT_EMOJI[current.intent] ?? "•"} {current.intent}
                        </span>
                      )}
                      {typeof current.distance_km === "number" && (
                        <span>{Math.round(current.distance_km)} km away</span>
                      )}
                    </div>
                    {current.bio && (
                      <p className="mt-3 text-gray-600 leading-relaxed">{current.bio}</p>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="flex items-center justify-center gap-6 mt-6">
              <button
                onClick={() => act("pass")}
                disabled={acting}
                aria-label="Pass"
                className="w-16 h-16 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors shadow disabled:opacity-50"
              >
                <X className="w-7 h-7" />
              </button>
              <button
                onClick={() => act("like")}
                disabled={acting}
                aria-label="Like"
                className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white shadow-lg hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
              >
                <Heart className="w-9 h-9" fill="currentColor" />
              </button>
            </div>

            <p className="text-center text-xs text-gray-400 mt-4">
              {candidates.length} profile{candidates.length !== 1 ? "s" : ""} ready
            </p>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
            <HeartCrack className="w-12 h-12 text-primary-300" />
            <h2 className="text-xl font-semibold text-gray-900">
              You&apos;re all caught up!
            </h2>
            <p className="text-gray-500 max-w-xs">
              No more profiles right now. Check back later — new people join every day.
            </p>
            <Link
              href="/"
              className="mt-2 px-6 py-2.5 bg-primary-600 text-white rounded-full font-medium hover:bg-primary-700 transition-colors"
            >
              Back home
            </Link>
          </div>
        )}
      </main>

      {/* It's a Match overlay */}
      <AnimatePresence>
        {matchWith && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-purple-900/80 backdrop-blur-sm flex items-center justify-center px-4"
            onClick={() => setMatchWith(null)}
          >
            <motion.div
              initial={{ scale: 0.7, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", bounce: 0.4 }}
              className="bg-white rounded-3xl p-10 max-w-sm w-full text-center shadow-2xl"
            >
              <Heart className="w-16 h-16 mx-auto text-secondary-500" fill="currentColor" />
              <h2 className="text-3xl font-bold text-gray-900 mt-4">It&apos;s a Match!</h2>
              <p className="text-gray-600 mt-2">
                You and {matchWith} liked each other. A chat thread is waiting.
              </p>
              <button
                onClick={() => setMatchWith(null)}
                className="mt-6 w-full py-3 bg-primary-600 text-white rounded-full font-medium hover:bg-primary-700 transition-colors"
              >
                Keep swiping
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
