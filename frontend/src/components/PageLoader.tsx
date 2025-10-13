import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

type PageLoaderProps = {
  title?: string
  subtitle?: string
  fullscreen?: boolean
  className?: string
}

export default function PageLoader({
  title = 'Yuklanmoqda...',
  subtitle,
  fullscreen = true,
  className,
}: PageLoaderProps) {
  return (
    <div
      className={cn(
        fullscreen ? 'min-h-screen' : 'h-full',
        'w-full flex items-center justify-center bg-gradient-subtle',
        className,
      )}
    >
      <div className='flex flex-col items-center gap-4 p-6'>
        <div className='relative'>
          {/* outer ring */}
          <div className='h-16 w-16 rounded-full border-4 border-border border-t-primary animate-spin' />
          {/* inner spinner icon */}
          <Loader2 className='absolute inset-0 m-auto h-6 w-6 text-primary animate-spin-slow' />
        </div>

        <div className='text-center'>
          <div className='text-sm font-medium text-muted-foreground'>{title}</div>
          {subtitle && (
            <div className='text-xs text-muted-foreground/80 mt-1'>{subtitle}</div>
          )}
        </div>

        {/* subtle progress shimmer */}
        <div className='mt-2 h-1 w-40 overflow-hidden rounded bg-muted'>
          <div className='h-full w-1/3 animate-loader bg-primary/70' />
        </div>
      </div>
    </div>
  )
}

// Tailwind animation helper: add via arbitrary keyframes if not present in global styles
// Using built-in animate-[custom] via arbitrary values could be noisy; we provide a simple utility class here.
declare global {
  interface HTMLElementTagNameMap {}
}