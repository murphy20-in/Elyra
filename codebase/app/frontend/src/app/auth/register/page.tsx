"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ArrowLeft, ArrowRight, Loader2, Check } from "lucide-react";
import toast from "react-hot-toast";

import { api, setTokens } from "@/lib/api";

const GENDERS = ["man", "woman", "non-binary", "transgender", "genderqueer", "agender", "prefer not to say"];
const ORIENTATIONS = ["gay", "lesbian", "bisexual", "pansexual", "queer", "asexual", "straight", "prefer not to say"];
const PRONOUNS = ["he/him", "she/her", "they/them", "he/they", "she/they", "any", "ask me"];
const INTENTS = [
  { value: "exploring", label: "Exploring", desc: "Open to see where things go" },
  { value: "serious", label: "Serious", desc: "Looking for something real" },
  { value: "discreet", label: "Discreet", desc: "Private, low-key connections" },
  { value: "friendship", label: "Friendship", desc: "Community and friends first" },
];

interface FormState {
  email: string;
  password: string;
  display_name: string;
  age: string;
  gender_identity: string;
  sexual_orientation: string;
  pronouns: string;
  intent: string;
  city: string;
  bio: string;
}

const INITIAL: FormState = {
  email: "",
  password: "",
  display_name: "",
  age: "",
  gender_identity: "",
  sexual_orientation: "",
  pronouns: "",
  intent: "",
  city: "",
  bio: "",
};

const STEP_TITLES = [
  "Create your account",
  "Tell us about you",
  "Your identity",
  "What are you looking for?",
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function canNext(): boolean {
    switch (step) {
      case 0:
        return /\S+@\S+\.\S+/.test(form.email) && form.password.length >= 8;
      case 1:
        return form.display_name.trim().length > 0 && Number(form.age) >= 18;
      case 2:
        return form.gender_identity !== "" && form.sexual_orientation !== "";
      default:
        return form.intent !== "";
    }
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      const res = await api.post<{ access_token: string; refresh_token: string }>(
        "/auth/register",
        {
          email: form.email,
          password: form.password,
          display_name: form.display_name,
          age: Number(form.age),
          gender_identity: form.gender_identity,
          sexual_orientation: form.sexual_orientation,
          pronouns: form.pronouns || undefined,
          intent: form.intent,
        }
      );
      setTokens(res.access_token, res.refresh_token);

      await api.put("/profiles/public", {
        display_name: form.display_name,
        age: Number(form.age),
        gender_identity: form.gender_identity,
        sexual_orientation: form.sexual_orientation,
        pronouns: form.pronouns || undefined,
        bio: form.bio || undefined,
        city: form.city || undefined,
        intent: form.intent,
      });

      toast.success("Welcome to Elyra!");
      router.push("/discover");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  const chip =
    "px-4 py-2 rounded-full border text-sm transition-colors cursor-pointer select-none";
  const chipOn = "border-primary-600 bg-primary-600 text-white";
  const chipOff = "border-gray-300 text-gray-700 hover:border-primary-400";

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2 justify-center">
            <Heart className="w-7 h-7 text-primary-600" fill="currentColor" />
            <span className="text-2xl font-bold text-primary-600">Elyra</span>
          </Link>
          <div className="flex items-center justify-center gap-2 mt-5">
            {STEP_TITLES.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i <= step ? "w-10 bg-primary-600" : "w-6 bg-gray-200"
                }`}
              />
            ))}
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mt-4">
            {STEP_TITLES[step]}
          </h1>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              {step === 0 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password <span className="text-gray-400">(min. 8 characters)</span>
                    </label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) => update("password", e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Your data is protected with AES-256 encryption. Private details are only
                    shared with people you choose.
                  </p>
                </>
              )}

              {step === 1 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Display name</label>
                    <input
                      value={form.display_name}
                      onChange={(e) => update("display_name", e.target.value)}
                      placeholder="How should we call you?"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                    <input
                      type="number"
                      min={18}
                      max={120}
                      value={form.age}
                      onChange={(e) => update("age", e.target.value)}
                      placeholder="18+"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      value={form.city}
                      onChange={(e) => update("city", e.target.value)}
                      placeholder="Mumbai, Delhi, Bangalore…"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none"
                    />
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Gender identity</label>
                    <div className="flex flex-wrap gap-2">
                      {GENDERS.map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => update("gender_identity", g)}
                          className={`${chip} ${form.gender_identity === g ? chipOn : chipOff}`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sexual orientation</label>
                    <div className="flex flex-wrap gap-2">
                      {ORIENTATIONS.map((o) => (
                        <button
                          key={o}
                          type="button"
                          onClick={() => update("sexual_orientation", o)}
                          className={`${chip} ${form.sexual_orientation === o ? chipOn : chipOff}`}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Pronouns</label>
                    <div className="flex flex-wrap gap-2">
                      {PRONOUNS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => update("pronouns", p)}
                          className={`${chip} ${form.pronouns === p ? chipOn : chipOff}`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Your intent</label>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {INTENTS.map((it) => (
                        <button
                          key={it.value}
                          type="button"
                          onClick={() => update("intent", it.value)}
                          className={`text-left p-4 rounded-xl border-2 transition-colors ${
                            form.intent === it.value
                              ? "border-primary-600 bg-primary-50"
                              : "border-gray-200 hover:border-primary-300"
                          }`}
                        >
                          <div className="flex items-center gap-2 font-medium text-gray-900">
                            {it.label}
                            {form.intent === it.value && (
                              <Check className="w-4 h-4 text-primary-600" />
                            )}
                          </div>
                          <div className="text-sm text-gray-500">{it.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bio <span className="text-gray-400">(optional)</span>
                    </label>
                    <textarea
                      value={form.bio}
                      onChange={(e) => update("bio", e.target.value)}
                      rows={3}
                      maxLength={500}
                      placeholder="What makes you, you?"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none resize-none"
                    />
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between mt-8">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="inline-flex items-center gap-1 px-4 py-2 text-gray-600 disabled:opacity-40 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            {step < 3 ? (
              <button
                type="button"
                onClick={() => canNext() && setStep((s) => s + 1)}
                disabled={!canNext()}
                className="inline-flex items-center gap-1 px-6 py-2.5 bg-primary-600 text-white rounded-full font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canNext() || loading}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-full font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Account
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-sm text-gray-600 mt-5">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-primary-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
