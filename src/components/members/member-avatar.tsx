import { initials } from "@/lib/members/display";

export function MemberAvatar({
  color,
  name,
  size = "md",
}: {
  color: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass = size === "lg" ? "size-20 text-xl" : size === "sm" ? "size-8 text-xs" : "size-12 text-sm";

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white shadow-sm ${sizeClass}`}
      style={{ backgroundColor: color ?? "#183a2b" }}
    >
      {initials(name || "League Member")}
    </div>
  );
}
