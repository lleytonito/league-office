export function TeamLogo({
  logoUrl,
  size = "md",
  teamName,
}: {
  logoUrl: string | null;
  size?: "md" | "lg";
  teamName: string;
}) {
  const sizeClass = size === "lg" ? "h-16 w-16 text-lg" : "h-12 w-12 text-base";

  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt=""
        className={`${sizeClass} shrink-0 rounded-full border border-[#d9decf] bg-[#f7f8f4] object-cover`}
        src={logoUrl}
      />
    );
  }

  return (
    <span
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-[#183a2b] font-semibold text-white`}
    >
      {teamName.slice(0, 2).toUpperCase()}
    </span>
  );
}
