"use client"

import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command"
import { useTheme } from "@/hooks/use-theme"
import { useWebSocketContext } from "@/hooks/use-websocket-context"
import { formatNezhaInfo } from "@/lib/utils"
import { NezhaWebsocketResponse } from "@/types/nezha-api"
import { Home, Moon, Sun, SunMoon } from "lucide-react"
import { createContext, useContext, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

// Create a context for the command dialog
export const DashCommandContext = createContext<{ open: boolean; setOpen: (open: boolean) => void } | undefined>(undefined)

// Custom hook to use the command context
export function useDashCommand() {
  const context = useContext(DashCommandContext)
  if (context === undefined) {
    throw new Error("useDashCommand must be used within a DashCommandProvider")
  }
  return context
}

// Provider component that will wrap the application
export function DashCommandProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  return (
    <DashCommandContext.Provider
      value={{
        open,
        setOpen: (newOpen) => setOpen(newOpen),
      }}
    >
      {children}
    </DashCommandContext.Provider>
  )
}

// The actual command dialog component
export function DashCommand() {
  const [search, setSearch] = useState("")
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { setTheme } = useTheme()
  const { open, setOpen } = useDashCommand()

  const { lastMessage, connected } = useWebSocketContext()

  const nezhaWsData = lastMessage ? (JSON.parse(lastMessage.data) as NezhaWebsocketResponse) : null

  // If not connected or no data, don't render the dialog content
  if (!connected || !nezhaWsData) {
    return null
  }

  const shortcuts = [
    {
      keywords: ["home", "homepage"],
      icon: <Home />,
      label: t("Home"),
      action: () => navigate("/"),
    },
    {
      keywords: ["light", "theme", "lightmode"],
      icon: <Sun />,
      label: t("ToggleLightMode"),
      action: () => setTheme("light"),
    },
    {
      keywords: ["dark", "theme", "darkmode"],
      icon: <Moon />,
      label: t("ToggleDarkMode"),
      action: () => setTheme("dark"),
    },
    {
      keywords: ["system", "theme", "systemmode"],
      icon: <SunMoon />,
      label: t("ToggleSystemMode"),
      action: () => setTheme("system"),
    },
  ].map((item) => ({
    ...item,
    value: `${item.keywords.join(" ")} ${item.label}`,
  }))

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder={t("TypeCommand")} value={search} onValueChange={setSearch} />
      <CommandList className="border-t">
        <CommandEmpty>{t("NoResults")}</CommandEmpty>
        {nezhaWsData.servers && nezhaWsData.servers.length > 0 && (
          <>
            <CommandGroup heading={t("Servers")}>
              {nezhaWsData.servers.map((server) => (
                <CommandItem
                  key={server.id}
                  value={server.name}
                  onSelect={() => {
                    navigate(`/server/${server.id}`)
                    setOpen(false)
                  }}
                >
                  {formatNezhaInfo(nezhaWsData.now, server).online ? (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-green-500 self-center" />
                  ) : (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-red-500 self-center" />
                  )}
                  <span>{server.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        <CommandSeparator />

        <CommandGroup heading={t("Shortcuts")}>
          {shortcuts.map((item) => (
            <CommandItem
              key={item.label}
              value={item.value}
              onSelect={() => {
                item.action()
                setOpen(false)
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
