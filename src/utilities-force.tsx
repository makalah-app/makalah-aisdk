// Force Tailwind to generate CSS variable utilities
// This file forces Tailwind to scan and include all our custom utilities

export const TailwindUtilities = () => {
  return (
    <div className="
      bg-background text-foreground 
      bg-card text-card-foreground 
      bg-primary text-primary-foreground
      bg-secondary text-secondary-foreground  
      bg-muted text-muted-foreground
      bg-accent text-accent-foreground
      bg-popover text-popover-foreground
      bg-destructive text-destructive-foreground
      border-border 
      border-input
      ring-ring
      bg-background/95 bg-background/80 bg-background/60
      bg-secondary/80 bg-secondary/60 bg-secondary/40
      hover:bg-secondary/80 hover:bg-secondary/60
      backdrop-blur-md backdrop-blur-sm
      shadow-sm shadow-md shadow-lg
      rounded-md rounded-lg rounded-xl
      px-2 px-3 px-4 px-6 py-1 py-2 py-3 py-4
      h-8 h-9 h-10 h-16 w-8 w-9 w-10
      text-xs text-sm text-lg text-xl text-2xl
      font-medium font-semibold font-bold
      gap-2 gap-3 gap-4 space-x-2 space-y-2
      flex items-center justify-center justify-between
      sticky top-0 z-50 relative
      min-h-screen min-h-[calc(100vh-4rem)]
      transition-all transition-colors duration-200
      group-hover:scale-110 group-hover:bg-secondary
      opacity-90 opacity-60 opacity-40
      animate-pulse
      hidden sm:block sm:flex sm:inline md:flex lg:flex
      max-w-2xl max-w-4xl mx-auto
      left-0 right-0 bottom-0 fixed
      overflow-hidden overflow-y-auto
      cursor-pointer hover:cursor-pointer
      border border-t border-b border-l border-r
      rounded-full rounded-none
      bg-gradient-to-br from-primary to-primary/80
      loading-dots message-enter shadow-cookbook
    " />
  )
}