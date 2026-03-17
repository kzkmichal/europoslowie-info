import { cn } from '@/lib/utils'
import type { WithChildrenProps } from '@/lib/types'

type ContainerProps = WithChildrenProps & {
  size?: 'default' | 'narrow' | 'wide'
}

export function Container({
  children,
  className,
  size = 'default',
  'data-testid': dataTestId,
  'data-cc': dataCc,
  id,
}: ContainerProps) {
  const sizeClasses = {
    narrow: 'max-w-3xl', // 768px
    default: 'max-w-7xl', // 1280px
    wide: 'max-w-screen-2xl', // 1536px
  }

  return (
    <div
      className={cn(
        'mx-auto w-full px-4 sm:px-6 lg:px-8',
        sizeClasses[size],
        className
      )}
      data-testid={dataTestId}
      data-cc={dataCc}
      id={id}
    >
      {children}
    </div>
  )
}
