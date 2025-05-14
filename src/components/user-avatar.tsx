import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AvatarProps {
  src?: string;
  fallback?: string | React.ReactElement;
  className?: string;
}

const getInitials = (name: string) => {
  const parts = name.trim().split(" ");
  const first = parts[0]?.[0] || "";
  const last = parts[parts.length - 1]?.[0] || "";
  return (first + last).toUpperCase();
};

export const UserAvatar = ({
  src,
  className,
  fallback = "Un Known",
}: AvatarProps) => {
  return (
    <Avatar className={className}>
      <AvatarImage src={src} alt="@shadcn" />
      <AvatarFallback>
        {typeof fallback === "string" ? getInitials(fallback) : fallback}
      </AvatarFallback>
    </Avatar>
  );
};
