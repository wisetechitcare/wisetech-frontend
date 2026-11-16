import { Avatar, AvatarFallback, AvatarImage } from "@/ds/ui/avatar"
import { cn } from "@/ds/lib/utils"

/** The project's avatar: its Gallery cover image, or the project initials when none is set. */
export function ProjectAvatar({ src, label, className }: { src?: string | null; label: string; className?: string }) {
  return (
    <Avatar className={cn("rounded-xl after:rounded-xl", className)}>
      {src && <AvatarImage src={src} alt="" className="rounded-xl object-cover" />}
      <AvatarFallback className="rounded-xl bg-accent font-semibold text-accent-foreground">{label}</AvatarFallback>
    </Avatar>
  )
}
