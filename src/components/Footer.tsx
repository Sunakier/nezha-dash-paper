import { fetchSetting } from "@/lib/nezha-api"
import { useQuery } from "@tanstack/react-query"
import React from "react"
import { useTranslation } from "react-i18next"
import { useDashCommand } from "./DashCommand"
import { Button } from "./ui/button"
import { Search } from "lucide-react"

const Footer: React.FC = () => {
  const { t } = useTranslation()
  const isMac = /macintosh|mac os x/i.test(navigator.userAgent)
  const { setOpen } = useDashCommand()

  const { data: settingData } = useQuery({
    queryKey: ["setting"],
    queryFn: () => fetchSetting(),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })

  return (
    <footer className="mx-auto w-full max-w-5xl px-4 lg:px-0 pb-4 server-footer">
      <section className="flex flex-col">
        <section className="mt-1 flex items-center sm:flex-row flex-col justify-between gap-2 text-[13px] font-light tracking-tight text-neutral-600/50 dark:text-neutral-300/50 server-footer-name">
          <div className="flex items-center gap-1">
            &copy;2020-{new Date().getFullYear()}{" "}
            <a href={"https://github.com/naiba/nezha"} target="_blank">
              Nezha
            </a>
            <p>{settingData?.data?.version || ""}</p>
          </div>
          <div className="server-footer-theme flex flex-col items-center sm:items-end">
            <p className="mt-1 text-[13px] font-light tracking-tight text-neutral-600/50 dark:text-neutral-300/50">
              {/* Show Ctrl+K shortcut on larger screens */}
              <kbd 
                className="mx-1 inline-flex h-4 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 hidden sm:inline-flex cursor-pointer hover:bg-muted/80"
                onClick={() => setOpen(true)}
              >
                {isMac ? <span className="text-xs">⌘</span> : "Ctrl "}K
              </kbd>
              {/* Show button on small screens */}
              <Button 
                variant="outline" 
                size="sm" 
                className="sm:hidden inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs z-10"
                onClick={() => setOpen(true)}
              >
                <Search className="h-3 w-3" />
                {t("Command")}
              </Button>
            </p>
            <section>
              {t("footer.themeBy")}
              <a href={"https://github.com/Sunakier/nezha-dash-paper"} target="_blank">
                nezha-dash-paper
              </a>
              {import.meta.env.VITE_GIT_HASH && (
                <a href={"https://github.com/Sunakier/nezha-dash-paper/commit/" + import.meta.env.VITE_GIT_HASH} className="ml-1">
                  ({import.meta.env.VITE_GIT_HASH})
                </a>
              )}
            </section>
          </div>
        </section>
      </section>
    </footer>
  )
}

export default Footer
