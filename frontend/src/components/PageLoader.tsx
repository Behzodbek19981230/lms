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
      <div
        role='status'
        aria-live='polite'
        className='w-full max-w-sm rounded-2xl border border-border/60 bg-gradient-card shadow-card backdrop-blur-sm p-6 sm:p-8 animate-scale-in'
      >
        <div className='flex flex-col items-center gap-5'>
          <div className='relative h-16 w-16'>
            <div className='absolute inset-0 rounded-full bg-primary/10 blur-md animate-pulse-glow' />
            <div className='absolute inset-0 rounded-full border-4 border-border/70 border-t-primary animate-spin' />
            <Loader2 className='absolute inset-0 m-auto h-6 w-6 text-primary animate-pulse-glow' />
          </div>

          <div className='text-center'>
            <div className='text-base font-semibold tracking-tight'>{title}</div>
            {subtitle && <div className='text-xs text-muted-foreground mt-1'>{subtitle}</div>}
            <span className='sr-only'>Yuklanmoqda</span>
          </div>

          <div className='mt-1 h-1.5 w-48 overflow-hidden rounded-full bg-muted relative'>
            <div className='absolute inset-0 w-[200%] bg-gradient-shimmer animate-shimmer' />
          </div>
        </div>
      </div>
    </div>
  )
}