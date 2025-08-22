'use client'

import type { ComponentType, MouseEvent } from 'react'
import { useState } from 'react'

type OpenDialogButtonProps<EProps, DProps> = {
  element: ComponentType<EProps & { onClick?: (e: MouseEvent) => void }>
  dialog: ComponentType<DProps & { open: boolean; setOpen: (val: boolean) => void }>
  elementProps?: EProps
  dialogProps?: DProps
}

export default function OpenDialogButton<EProps, DProps>(props: OpenDialogButtonProps<EProps, DProps>) {
  const { element: Element, dialog: Dialog, elementProps = {} as EProps, dialogProps = {} as DProps } = props

  const [open, setOpen] = useState(false)

  const { onClick: elementClick, ...restProps } = elementProps as EProps & {
    onClick?: (e: MouseEvent) => void
  }

  const onClick = (e: MouseEvent) => {
    e.stopPropagation()
    elementClick?.(e)
    setOpen(true)
  }

  const handleDialogClick = (e: MouseEvent) => {
    e.stopPropagation()
  }

  return (
    <>
      <Element onClick={onClick} {...(restProps as EProps)} />
      {open && (
        <div onClick={handleDialogClick}>
          <Dialog open={open} setOpen={setOpen} {...dialogProps} />
        </div>
      )}
    </>
  )
}
