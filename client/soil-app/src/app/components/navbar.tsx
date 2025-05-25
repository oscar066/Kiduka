"use client"

import { Bell, Search, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function Navbar() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-amber-200 bg-white px-4 shadow-sm">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="text-green-700 hover:bg-green-50" />
        <div className="hidden md:flex items-center gap-2">
          <Search className="h-4 w-4 text-gray-500" />
          <Input placeholder="Search fields, reports..." className="w-64 border-amber-200 focus:border-green-500" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="text-green-700 hover:bg-green-50">
          <Bell className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-green-700 hover:bg-green-50">
              <User className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="border-amber-200">
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuItem>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
