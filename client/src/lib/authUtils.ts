export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

export function getInitials(firstName?: string | null, lastName?: string | null): string {
  if (!firstName && !lastName) return "U";
  const first = firstName?.charAt(0) || "";
  const last = lastName?.charAt(0) || "";
  return (first + last).toUpperCase();
}

export function getFullName(firstName?: string | null, lastName?: string | null): string {
  if (!firstName && !lastName) return "User";
  return `${firstName || ""} ${lastName || ""}`.trim();
}

// Generate consistent avatar color based on user ID
export function getAvatarColor(id: string): string {
  const colors = [
    "hsl(217 91% 60%)",   // primary blue
    "hsl(142 76% 36%)",   // success green
    "hsl(38 92% 50%)",    // warning amber
    "hsl(280 65% 60%)",   // purple
    "hsl(340 82% 52%)",   // pink
    "hsl(199 89% 48%)",   // cyan
    "hsl(25 95% 53%)",    // orange
    "hsl(173 58% 39%)",   // teal
    "hsl(262 83% 58%)",   // violet
    "hsl(47 96% 53%)",    // yellow
  ];
  
  const hash = id.split("").reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  return colors[Math.abs(hash) % colors.length];
}
