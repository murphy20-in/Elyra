"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Shield, Heart, Sparkles } from "lucide-react";

export default function Home() {
  const features = [
    {
      icon: Shield,
      title: "Dual Identity",
      description:
        "Your Pehchaan Layer keeps you safe while you express your true self.",
    },
    {
      icon: Heart,
      title: "Safe Date",
      description:
        "Verified profiles and safety check-ins protect you every step of the way.",
    },
    {
      icon: Sparkles,
      title: "AI-Powered Matching",
      description:
        "Smart recommendations help you find people who truly resonate with you.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="py-20 text-center"
        >
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            <span className="text-primary-600">Elyra</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-2xl mx-auto">
            A safer way to connect, explore identity, and build real
            connections.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/register"
              className="px-8 py-3 bg-primary-600 text-white rounded-full font-medium hover:bg-primary-700 transition-colors"
            >
              Get Started
            </Link>
            <Link
              href="/about"
              className="px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-full font-medium hover:border-primary-600 hover:text-primary-600 transition-colors"
            >
              Learn More
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="py-16"
        >
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100"
              >
                <feature.icon className="w-12 h-12 text-primary-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>

      <footer className="py-12 border-t border-gray-200 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-600 mb-2">
            Built for the community, by the community.
          </p>
          <p className="text-sm text-gray-500">India-first, privacy-first</p>
        </div>
      </footer>
    </div>
  );
}