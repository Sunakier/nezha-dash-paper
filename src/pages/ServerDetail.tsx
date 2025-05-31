import { NetworkChart } from "@/components/NetworkChart"
import ServerDetailChart from "@/components/ServerDetailChart"
import ServerDetailOverview from "@/components/ServerDetailOverview"
import TabSwitch from "@/components/TabSwitch"
import { Separator } from "@/components/ui/separator"
import { fetchMonitor } from "@/lib/nezha-api"
import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

export default function ServerDetail() {
  const navigate = useNavigate()
  const { id: server_id } = useParams()

  // Initialize state with a default value
  const [currentTab, setCurrentTab] = useState("Detail")

  // Fetch monitor data to check if it's available - only if server_id exists
  const { data: monitorData } = useQuery({
    queryKey: ["monitor", server_id ? Number(server_id) : null],
    queryFn: () => server_id ? fetchMonitor(Number(server_id)) : Promise.reject("No server ID"),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 10000,
    enabled: !!server_id, // Only run the query if server_id exists
  })

  // Determine if we should show the Network tab
  const hasMonitorData = monitorData?.success && monitorData.data && monitorData.data.length > 0

  // Only include Network tab if there's monitor data
  const tabs = hasMonitorData ? ["Detail", "Network"] : ["Detail"]

  // Update currentTab when tabs change
  useEffect(() => {
    setCurrentTab(tabs[0])
  }, [tabs])

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" })
  }, [])

  // Handle navigation if no server_id
  useEffect(() => {
    if (!server_id) {
      navigate("/404")
    }
  }, [server_id, navigate])

  if (!server_id) {
    return null
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-0 flex flex-col gap-4 server-info">
      <ServerDetailOverview server_id={server_id} />
      <section className="flex items-center my-2 w-full">
        <Separator className="flex-1" />
        <div className="flex justify-center w-full max-w-[200px]">
          <TabSwitch tabs={tabs} currentTab={currentTab} setCurrentTab={setCurrentTab} />
        </div>
        <Separator className="flex-1" />
      </section>
      <div style={{ display: currentTab === "Detail" ? "block" : "none" }}>
        <ServerDetailChart server_id={server_id} />
      </div>
      {hasMonitorData && (
        <div style={{ display: currentTab === "Network" ? "block" : "none" }}>
          <NetworkChart server_id={Number(server_id)} show={currentTab === "Network"} />
        </div>
      )}
    </div>
  )
}
