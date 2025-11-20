"use client"

import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"

export function Topbar() {
  return (
    <header className="sticky top-0 bg-white z-20">
      <div className="h-14 px-4 flex items-center justify-between">
        <div className="font-semibold text-lg"></div>
        <Button variant="outline" size="sm">Settings</Button>
      </div>
      <Separator />
    </header>
  )
}
