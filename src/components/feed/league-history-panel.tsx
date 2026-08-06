"use client";

import { BarChart3, ChevronLeft, ChevronRight, UsersRound } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

export type HomeAnalyticsSlide = {
  cta?: string;
  href: string;
  label: string;
  meta?: string;
  rankLabel?: string;
  stats?: Array<{ label: string; value: string }>;
  tone?: "blue" | "green" | "red" | "slate";
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
  const touchStartX = useRef<number | null>(null);
  const activeSlide = slides[index] ?? null;
  const goToPrevious = () => setIndex((current) => (current - 1 + slides.length) % slides.length);
  const goToNext = () => setIndex((current) => (current + 1) % slides.length);

  function handleTouchEnd(clientX: number) {
    if (touchStartX.current === null || slides.length < 2) {
      touchStartX.current = null;
      return;
    }

    const distance = clientX - touchStartX.current;
    touchStartX.current = null;

    if (Math.abs(distance) < 38) {
      return;
    }

    if (distance < 0) {
      goToNext();
    } else {
      goToPrevious();
    }
  }

  return (
    <section className="rounded-[10px] border border-[#d9decf] bg-[#eef2e8] p-3 shadow-sm">
      <div className="grid gap-3">
        <div
          className="grid gap-2"
          onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
          onTouchStart={(event) => {
            touchStartX.current = event.touches[0]?.clientX ?? null;
          }}
        >
          {activeSlide ? (
            <article
              className={`overflow-hidden rounded-[10px] border p-4 shadow-sm transition ${slideTone(activeSlide.tone)}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#ffffffcc]">
                    {activeSlide.label}
                  </p>
                  <Link
                    className="mt-1 block truncate text-xl font-semibold text-white underline-offset-4 hover:underline"
                    href={activeSlide.href}
                  >
                    {activeSlide.title}
                  </Link>
                  <p className="truncate text-sm text-[#ffffffbf]">{activeSlide.meta ?? teamName}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-3xl font-semibold text-white">{activeSlide.value}</p>
                  {activeSlide.rankLabel ? (
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#ffffffbf]">
                      {activeSlide.rankLabel}
                    </p>
                  ) : null}
                </div>
              </div>

              {activeSlide.stats?.length ? (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {activeSlide.stats.map((stat) => (
                    <div className="rounded-[8px] bg-white/14 p-2 text-white backdrop-blur" key={stat.label}>
                      <p className="text-lg font-semibold leading-none">{stat.value}</p>
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#ffffffb8]">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}

              <Link
                className="mt-4 inline-flex h-9 items-center justify-center rounded-full bg-white/90 px-3 text-sm font-semibold text-[#183a2b] transition hover:bg-white"
                href={activeSlide.href}
              >
                {activeSlide.cta ?? "Open analytic"}
              </Link>
            </article>
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
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#c8d1be] bg-white text-[#293421] transition hover:bg-[#f7f8f4]"
                onClick={goToPrevious}
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
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#c8d1be] bg-white text-[#293421] transition hover:bg-[#f7f8f4]"
                onClick={goToNext}
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

function slideTone(tone: HomeAnalyticsSlide["tone"]) {
  if (tone === "red") {
    return "border-[#b85b41] bg-[#7f2f20]";
  }

  if (tone === "blue") {
    return "border-[#5d9ab8] bg-[#2f6f8f]";
  }

  if (tone === "slate") {
    return "border-[#6f776b] bg-[#3d4c43]";
  }

  return "border-[#587246] bg-[#183a2b]";
}
