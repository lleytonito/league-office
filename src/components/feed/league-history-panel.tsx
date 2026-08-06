"use client";

import { BarChart3, ChevronLeft, ChevronRight, UsersRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export type HomeAnalyticsSlide = {
  href: string;
  label: string;
  rankLabel?: string;
  title: string;
  value: string;
};

export function LeagueHistoryPanel({
  slides = [],
  teamName,
}: {
  slides?: HomeAnalyticsSlide[];
  teamName: string;
}) {
  const [index, setIndex] = useState(0);
  const activeSlide = slides[index] ?? null;

  return (
    <section className="rounded-[10px] border border-[#d9decf] bg-[#eef2e8] p-3 shadow-sm">
      <div className="grid gap-3">
        <div className="grid gap-2">
          {activeSlide ? (
            <Link
              className="group rounded-[9px] border border-[#c8d1be] bg-white p-3 transition hover:border-[#b9c7ad]"
              href={activeSlide.href}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6a725f]">
                    {activeSlide.label}
                  </p>
                  <h2 className="mt-1 truncate text-lg font-semibold text-[#293421]">{activeSlide.title}</h2>
                  <p className="truncate text-sm text-[#626b59]">{teamName}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-2xl font-semibold text-[#293421]">{activeSlide.value}</p>
                  {activeSlide.rankLabel ? (
                    <p className="text-xs font-semibold text-[#6a725f]">{activeSlide.rankLabel}</p>
                  ) : null}
                </div>
              </div>
            </Link>
          ) : (
            <div className="rounded-[9px] border border-[#c8d1be] bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6a725f]">Your team</p>
              <h2 className="truncate text-lg font-semibold text-[#293421]">{teamName}</h2>
            </div>
          )}

          {slides.length > 1 ? (
            <div className="flex items-center justify-between gap-3 px-1">
              <button
                aria-label="Previous team stat"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#c8d1be] bg-white text-[#293421] transition hover:bg-[#f7f8f4]"
                onClick={() => setIndex((current) => (current - 1 + slides.length) % slides.length)}
                type="button"
              >
                <ChevronLeft size={16} aria-hidden="true" />
              </button>
              <div className="flex items-center gap-1.5">
                {slides.map((slide, slideIndex) => (
                  <button
                    aria-label={`Show ${slide.label}`}
                    className={`h-2 rounded-full transition-all ${
                      slideIndex === index ? "w-5 bg-[#183a2b]" : "w-2 bg-[#b7c3ac]"
                    }`}
                    key={`${slide.label}-${slideIndex}`}
                    onClick={() => setIndex(slideIndex)}
                    type="button"
                  />
                ))}
              </div>
              <button
                aria-label="Next team stat"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#c8d1be] bg-white text-[#293421] transition hover:bg-[#f7f8f4]"
                onClick={() => setIndex((current) => (current + 1) % slides.length)}
                type="button"
              >
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2 min-[520px]:w-[260px]">
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[#c8d1be] bg-white px-3 text-sm font-semibold text-[#293421] transition hover:bg-[#f7f8f4]"
            href="/members"
          >
            <UsersRound size={17} aria-hidden="true" />
            View Teams
          </Link>
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[#c8d1be] bg-white px-3 text-sm font-semibold text-[#293421] transition hover:bg-[#f7f8f4]"
            href="/analytics"
          >
            <BarChart3 size={17} aria-hidden="true" />
            Analytics
          </Link>
        </div>
      </div>
    </section>
  );
}
