"use client";

import { BarChart3, ChevronLeft, ChevronRight, UsersRound } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useRef, useState } from "react";

export type HomeAnalyticsSlide = {
  cta?: string;
  href: string;
  kind?: "historicalRanking" | "metric" | "team";
  label: string;
  logoUrl?: string | null;
  meta?: string;
  rankLabel?: string;
  stats?: Array<{ detail?: string; href?: string; label: string; value: string }>;
  tone?: "blue" | "brown" | "green" | "red" | "slate" | "teal";
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
  const [direction, setDirection] = useState(0);
  const [dragX, setDragX] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const activeSlide = slides[index] ?? null;
  const goToPrevious = () => {
    setDirection(-1);
    setIndex((current) => (current - 1 + slides.length) % slides.length);
  };
  const goToNext = () => {
    setDirection(1);
    setIndex((current) => (current + 1) % slides.length);
  };

  function handleTouchEnd(clientX: number) {
    if (touchStartX.current === null || slides.length < 2) {
      touchStartX.current = null;
      return;
    }

    const distance = clientX - touchStartX.current;
    touchStartX.current = null;
    setDragX(0);

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
          onTouchMove={(event) => {
            if (touchStartX.current === null || slides.length < 2) {
              return;
            }

            const currentX = event.touches[0]?.clientX ?? touchStartX.current;
            setDragX(Math.max(Math.min(currentX - touchStartX.current, 36), -36));
          }}
          onTouchStart={(event) => {
            touchStartX.current = event.touches[0]?.clientX ?? null;
          }}
        >
          {activeSlide ? (
            <article
              className={`min-h-[164px] overflow-hidden rounded-[10px] border shadow-sm transition-all duration-300 ease-out motion-reduce:transition-none ${
                direction >= 0 ? "animate-[slideInRight_220ms_ease-out]" : "animate-[slideInLeft_220ms_ease-out]"
              } ${
                activeSlide.kind === "historicalRanking"
                  ? "border-[#8c8266] bg-[#837b67] p-[2px]"
                  : activeSlide.kind === "team"
                    ? "border-[#8a6a4c] bg-[#3f3027] p-[2px]"
                  : `${slideTone(activeSlide.tone)} p-3`
              }`}
              key={`${activeSlide.title}-${index}`}
              style={dragX ? { transform: `translateX(${dragX}px)` } : undefined}
            >
              {activeSlide.kind === "historicalRanking" ? (
                <HistoricalRankingSlide slide={activeSlide} />
              ) : activeSlide.kind === "team" ? (
                <TeamSummarySlide slide={activeSlide} />
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    {activeSlide.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-full border border-white/30 bg-white/15 object-cover"
                        src={activeSlide.logoUrl}
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#ffffffcc]">
                        {activeSlide.label}
                      </p>
                      <Link
                        className="-mx-1 mt-1 inline-flex max-w-full items-center truncate rounded-[6px] px-1 text-lg font-semibold text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/75"
                        href={activeSlide.href}
                      >
                        {activeSlide.title}
                      </Link>
                      <p className="truncate text-sm text-[#ffffffbf]">{activeSlide.meta ?? teamName}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-2xl font-semibold text-white">{activeSlide.value}</p>
                      {activeSlide.rankLabel ? (
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#ffffffbf]">
                          {activeSlide.rankLabel}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {activeSlide.stats?.length ? (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {activeSlide.stats.map((stat) => (
                        <StatTile href={stat.href} key={stat.label}>
                          <p className="truncate text-base font-semibold leading-none">{stat.value}</p>
                          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#ffffffb8]">
                            {stat.label}
                          </p>
                        </StatTile>
                      ))}
                    </div>
                  ) : null}
                </>
              )}
            </article>
          ) : (
            <div className="rounded-[9px] border border-[#c8d1be] bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6a725f]">Your team</p>
              <h2 className="truncate text-lg font-semibold text-[#293421]">{teamName}</h2>
            </div>
          )}

          {slides.length > 1 ? (
            <div className="flex items-center justify-center gap-3 px-1 sm:justify-between">
              <button
                aria-label="Previous team stat"
                className="hidden h-10 w-10 items-center justify-center rounded-full border border-[#c8d1be] bg-white text-[#293421] transition hover:bg-[#f7f8f4] sm:flex"
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
                className="hidden h-10 w-10 items-center justify-center rounded-full border border-[#c8d1be] bg-white text-[#293421] transition hover:bg-[#f7f8f4] sm:flex"
                onClick={goToNext}
                type="button"
              >
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[#aeb9a4] bg-[#e8ede2] px-3 text-sm font-semibold text-[#293421] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition hover:bg-[#dfe7d8]"
            href="/members"
          >
            <UsersRound size={17} aria-hidden="true" />
            View Teams
          </Link>
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[#aeb9a4] bg-[#e8ede2] px-3 text-sm font-semibold text-[#293421] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition hover:bg-[#dfe7d8]"
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

  if (tone === "teal") {
    return "border-[#4f9a94] bg-[#245d5a]";
  }

  if (tone === "brown") {
    return "border-[#8d7154] bg-[#5a4231]";
  }

  return "border-[#658250] bg-[#3f5f36]";
}

function HistoricalRankingSlide({ slide }: { slide: HomeAnalyticsSlide }) {
  return (
    <Link
      className="relative block min-h-[158px] rounded-[8px] text-[#1a2119] outline-none transition hover:scale-[1.003] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ead7a2]"
      href={slide.href}
    >
      <div className="absolute inset-0 rounded-[8px] border border-[#d1c49a] bg-[#eef0e7]" />
      <div className="pointer-events-none absolute inset-x-4 top-3 h-px bg-[#b59657]/70" />
      <div className="pointer-events-none absolute inset-x-4 bottom-3 h-px bg-[#b59657]/40" />
      <div className="relative grid min-h-[158px] grid-cols-[1fr_auto] items-center gap-3 px-4 py-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#4f5b4f]">
            {slide.label}
          </p>
          <h2 className="mt-2 max-w-[170px] text-[1.45rem] font-semibold leading-[1.02] text-[#152116]">
            {slide.title}
          </h2>
          {slide.rankLabel ? (
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#8b691f]">
              {slide.rankLabel}
            </p>
          ) : null}
        </div>
        <div className="relative flex h-[104px] w-[122px] items-center justify-center">
          <svg
            aria-hidden="true"
            className="absolute inset-0 h-full w-full drop-shadow-sm"
            fill="none"
            viewBox="0 0 122 104"
          >
            <path
              d="M21 8H101L116 23V81L101 96H21L6 81V23L21 8Z"
              fill="#494236"
              stroke="#B59657"
              strokeWidth="1.2"
            />
            <path
              d="M28 20H94L105 31V73L94 84H28L17 73V31L28 20Z"
              stroke="#766F5B"
              strokeWidth="1"
            />
          </svg>
          <span
            className={`relative font-semibold leading-none text-white drop-shadow-sm ${
              slide.value.length > 3 ? "text-[2.35rem]" : slide.value.length > 2 ? "text-[2.7rem]" : "text-5xl"
            }`}
          >
            {slide.value}
          </span>
        </div>
      </div>
    </Link>
  );
}

function TeamSummarySlide({ slide }: { slide: HomeAnalyticsSlide }) {
  const [firstStat, secondStat] = slide.stats ?? [];

  return (
    <div className="relative block min-h-[158px] rounded-[8px] bg-[#4b382b] text-[#f2e8d3]">
      <div className="absolute inset-0 rounded-[8px] border border-[#8a6a4c]" />
      <div className="pointer-events-none absolute inset-x-4 top-4 h-px bg-[#b59657]/60" />
      <div className="pointer-events-none absolute right-4 top-4 flex gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-[#b59657]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#b59657]/70" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#b59657]/45" />
      </div>
      <div className="relative grid min-h-[158px] content-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#b59657]">{slide.label}</p>
          <Link
            className={`mt-3 block max-w-full truncate rounded-[6px] font-semibold leading-[1.02] text-[#f2e8d3] outline-none transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b59657] ${
              teamTitleClass(slide.title)
            }`}
            href={slide.href}
          >
            {slide.title}
          </Link>
          <div className="mt-3 h-px w-full bg-[#b59657]/70">
            <div className="mx-auto h-[3px] w-8 -translate-y-px rounded-full bg-[#b59657]" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {firstStat ? <TeamStatTile stat={firstStat} emphasis /> : null}
          {secondStat ? <TeamStatTile stat={secondStat} /> : null}
        </div>
      </div>
    </div>
  );
}

function TeamStatTile({
  emphasis = false,
  stat,
}: {
  emphasis?: boolean;
  stat: NonNullable<HomeAnalyticsSlide["stats"]>[number];
}) {
  const contents = (
    <>
      <p className={`truncate font-semibold leading-none ${emphasis ? "text-3xl text-[#f2e8d3]" : "text-lg text-[#f2e8d3]"}`}>
        {stat.value}
      </p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#c9bca4]">{stat.label}</p>
      {stat.detail ? <p className="mt-1 truncate text-[11px] font-semibold text-[#b59657]">{stat.detail}</p> : null}
    </>
  );

  const className =
    "min-h-[70px] rounded-[8px] border border-[#8a6a4c] bg-[#735a43]/58 p-3 shadow-[inset_0_1px_0_rgba(242,232,211,0.08)] transition hover:bg-[#735a43]/75";

  return stat.href ? (
    <Link className={className} href={stat.href}>
      {contents}
    </Link>
  ) : (
    <div className={className}>{contents}</div>
  );
}

function teamTitleClass(title: string) {
  if (title.length > 30) {
    return "text-[1.45rem]";
  }

  if (title.length > 22) {
    return "text-[1.75rem]";
  }

  return "text-3xl";
}

function StatTile({
  children,
  href,
}: {
  children: ReactNode;
  href?: string;
}) {
  const className = "rounded-[8px] bg-white/14 p-2 text-white backdrop-blur transition hover:bg-white/20";

  return href ? (
    <Link className={className} href={href}>
      {children}
    </Link>
  ) : (
    <div className={className}>{children}</div>
  );
}
