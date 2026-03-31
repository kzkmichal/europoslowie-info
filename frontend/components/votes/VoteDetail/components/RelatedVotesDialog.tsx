'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

type RootProps = {
  children: React.ReactNode
}

type TriggerProps = {
  children: React.ReactNode
}

type ContentProps = {
  title: string
  children: React.ReactNode
}

const Root = ({ children }: RootProps) => <Dialog>{children}</Dialog>

const Trigger = ({ children }: TriggerProps) => (
  <DialogTrigger asChild>{children}</DialogTrigger>
)

const Content = ({ title, children }: ContentProps) => (
  <DialogContent className="max-w-lg">
    <DialogHeader>
      <DialogTitle>{title}</DialogTitle>
    </DialogHeader>
    <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
      {children}
    </div>
  </DialogContent>
)

export const RelatedVotesDialog = Object.assign(Root, { Trigger, Content })
