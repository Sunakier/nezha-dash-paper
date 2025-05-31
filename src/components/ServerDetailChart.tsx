import { Card, CardContent } from "@/components/ui/card"
import { ChartConfig, ChartContainer } from "@/components/ui/chart"
import { useWebSocketContext } from "@/hooks/use-websocket-context"
import { formatBytes } from "@/lib/format"
import { cn, formatNezhaInfo, formatRelativeTime } from "@/lib/utils"
import { NezhaServer, NezhaWebsocketResponse } from "@/types/nezha-api"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Area, AreaChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import { ServerDetailChartLoading } from "./loading/ServerDetailLoading"
import AnimatedCircularProgressBar from "./ui/animated-circular-progress-bar"

type gpuChartData = {
  timeStamp: string
  gpu: number
}

type cpuChartData = {
  timeStamp: string
  cpu: number
}

type processChartData = {
  timeStamp: string
  process: number
}

type diskChartData = {
  timeStamp: string
  disk: number
}

type memChartData = {
  timeStamp: string
  mem: number
  swap: number
}

type networkChartData = {
  timeStamp: string
  upload: number
  download: number
}

type connectChartData = {
  timeStamp: string
  tcp: number
  udp: number
}

export default function ServerDetailChart({ server_id }: { server_id: string }) {
  const { lastMessage, connected, messageHistory } = useWebSocketContext()

  if (!connected && !lastMessage) {
    return <ServerDetailChartLoading />
  }

  const nezhaWsData = lastMessage ? (JSON.parse(lastMessage.data) as NezhaWebsocketResponse) : null

  if (!nezhaWsData) {
    return <ServerDetailChartLoading />
  }

  const server = nezhaWsData.servers.find((s) => s.id === Number(server_id))

  if (!server) {
    return <ServerDetailChartLoading />
  }

  const gpuStats = server.state.gpu || []
  const gpuList = server.host.gpu || []

  return (
    <section className="grid md:grid-cols-2 lg:grid-cols-3 grid-cols-1 gap-3 server-charts">
      <CpuChart now={nezhaWsData.now} data={server} messageHistory={messageHistory} />
      {gpuStats.length >= 1 && gpuList.length === gpuStats.length ? (
        gpuList.map((gpu, index) => (
          <GpuChart
            index={index}
            id={server.id}
            now={nezhaWsData.now}
            gpuStat={gpuStats[index]}
            gpuName={gpu}
            messageHistory={messageHistory}
            key={index}
          />
        ))
      ) : gpuStats.length > 0 ? (
        gpuStats.map((gpu, index) => (
          <GpuChart
            index={index}
            id={server.id}
            now={nezhaWsData.now}
            gpuStat={gpu}
            gpuName={`#${index + 1}`}
            messageHistory={messageHistory}
            key={index}
          />
        ))
      ) : (
        <></>
      )}
      <ProcessChart now={nezhaWsData.now} data={server} messageHistory={messageHistory} />
      <DiskChart now={nezhaWsData.now} data={server} messageHistory={messageHistory} />
      <MemChart now={nezhaWsData.now} data={server} messageHistory={messageHistory} />
      <NetworkChart now={nezhaWsData.now} data={server} messageHistory={messageHistory} />
      <ConnectChart now={nezhaWsData.now} data={server} messageHistory={messageHistory} />
    </section>
  )
}

function GpuChart({
  id,
  index,
  gpuStat,
  gpuName,
  messageHistory,
}: {
  now: number
  id: number
  index: number
  gpuStat: number
  gpuName?: string
  messageHistory: { data: string }[]
}) {
  const [gpuChartData, setGpuChartData] = useState<gpuChartData[]>([])
  const hasInitialized = useRef(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)

  const customBackgroundImage = (window.CustomBackgroundImage as string) !== "" ? window.CustomBackgroundImage : undefined

  // 初始化历史数据
  useEffect(() => {
    if (!hasInitialized.current && messageHistory.length > 0) {
      const historyData = messageHistory
        .map((msg) => {
          const wsData = JSON.parse(msg.data) as NezhaWebsocketResponse
          const server = wsData.servers.find((s) => s.id === id)
          if (!server) return null
          const { gpu } = formatNezhaInfo(wsData.now, server)
          return {
            timeStamp: wsData.now.toString(),
            gpu: gpu[index],
          }
        })
        .filter((item): item is gpuChartData => item !== null)
        .reverse()

      setGpuChartData(historyData)
      hasInitialized.current = true
      setHistoryLoaded(true)
    }
  }, [messageHistory])

  useEffect(() => {
    if (gpuStat && historyLoaded) {
      const timestamp = Date.now().toString()
      setGpuChartData((prevData) => {
        let newData = [] as gpuChartData[]
        if (prevData.length === 0) {
          newData = [
            { timeStamp: timestamp, gpu: gpuStat },
            { timeStamp: timestamp, gpu: gpuStat },
          ]
        } else {
          newData = [...prevData, { timeStamp: timestamp, gpu: gpuStat }]

          // Ensure we keep enough data points to cover 60 seconds
          const currentTime = Date.now()
          const sixtySecondsAgo = currentTime - 60000

          // Find the oldest data point that's within the 60-second window
          let oldestIndex = 0
          for (let i = 0; i < newData.length; i++) {
            if (parseInt(newData[i].timeStamp) >= sixtySecondsAgo) {
              oldestIndex = i
              break
            }
          }

          // If we have data points older than 60 seconds, keep one data point at exactly 60s
          if (oldestIndex > 0) {
            // Calculate a value for the 60s mark by interpolating between the closest points
            const olderPoint = newData[Math.max(0, oldestIndex - 1)]
            const newerPoint = newData[oldestIndex]

            const olderTime = parseInt(olderPoint.timeStamp)
            const newerTime = parseInt(newerPoint.timeStamp)

            // If we have points on both sides of the 60s mark, interpolate
            if (olderTime < sixtySecondsAgo && newerTime > sixtySecondsAgo) {
              const ratio = (sixtySecondsAgo - olderTime) / (newerTime - olderTime)
              const interpolatedValue = olderPoint.gpu + ratio * (newerPoint.gpu - olderPoint.gpu)

              // Replace all older points with just the 60s point
              newData = [{ timeStamp: sixtySecondsAgo.toString(), gpu: interpolatedValue }, ...newData.slice(oldestIndex)]
            } else {
              // Just keep points within the 60s window
              newData = newData.slice(oldestIndex - 1)
            }
          }

          // Limit the total number of points to prevent excessive memory usage
          if (newData.length > 60) {
            newData = newData.slice(newData.length - 60)
          }
        }
        return newData
      })
    }
  }, [gpuStat, historyLoaded])

  const chartConfig = {
    gpu: {
      label: "GPU",
    },
  } satisfies ChartConfig

  return (
    <Card
      className={cn({
        "bg-card/70": customBackgroundImage,
      })}
    >
      <CardContent className="px-6 py-3">
        <section className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <section className="flex flex-col items-center gap-2">
              {!gpuName && <p className="text-md font-medium">GPU</p>}
              {gpuName && <p className="text-xs mt-1 mb-1.5">GPU: {gpuName}</p>}
            </section>
            <section className="flex items-center gap-2">
              <p className="text-xs text-end w-10 font-medium">{gpuStat.toFixed(2)}%</p>
              <AnimatedCircularProgressBar className="size-3 text-[0px]" max={100} min={0} value={gpuStat} primaryColor="hsl(var(--chart-3))" />
            </section>
          </div>
          <ChartContainer config={chartConfig} className="aspect-auto h-[130px] w-full">
            <AreaChart
              accessibilityLayer
              data={gpuChartData}
              margin={{
                top: 12,
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="timeStamp"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={200}
                interval="preserveStartEnd"
                tickFormatter={(value) => formatRelativeTime(value)}
              />
              <YAxis tickLine={false} axisLine={false} mirror={true} tickMargin={-15} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
              <Area isAnimationActive={false} dataKey="gpu" type="step" fill="hsl(var(--chart-3))" fillOpacity={0.3} stroke="hsl(var(--chart-3))" />
            </AreaChart>
          </ChartContainer>
        </section>
      </CardContent>
    </Card>
  )
}

function CpuChart({ now, data, messageHistory }: { now: number; data: NezhaServer; messageHistory: { data: string }[] }) {
  const [cpuChartData, setCpuChartData] = useState<cpuChartData[]>([])
  const hasInitialized = useRef(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)

  const { cpu } = formatNezhaInfo(now, data)

  const customBackgroundImage = (window.CustomBackgroundImage as string) !== "" ? window.CustomBackgroundImage : undefined

  // 初始化历史数据
  useEffect(() => {
    if (!hasInitialized.current && messageHistory.length > 0) {
      const historyData = messageHistory
        .map((msg) => {
          const wsData = JSON.parse(msg.data) as NezhaWebsocketResponse
          const server = wsData.servers.find((s) => s.id === data.id)
          if (!server) return null
          const { cpu } = formatNezhaInfo(wsData.now, server)
          return {
            timeStamp: wsData.now.toString(),
            cpu: cpu,
          }
        })
        .filter((item): item is cpuChartData => item !== null)
        .reverse() // 保持时间顺序

      setCpuChartData(historyData)
      hasInitialized.current = true
      setHistoryLoaded(true)
    }
  }, [messageHistory])

  // 更新实时数据
  useEffect(() => {
    if (data && historyLoaded) {
      const timestamp = Date.now().toString()
      setCpuChartData((prevData) => {
        let newData = [] as cpuChartData[]
        if (prevData.length === 0) {
          newData = [
            { timeStamp: timestamp, cpu: cpu },
            { timeStamp: timestamp, cpu: cpu },
          ]
        } else {
          newData = [...prevData, { timeStamp: timestamp, cpu: cpu }]

          // Ensure we keep enough data points to cover 60 seconds
          const currentTime = Date.now()
          const sixtySecondsAgo = currentTime - 60000

          // Find the oldest data point that's within the 60-second window
          let oldestIndex = 0
          for (let i = 0; i < newData.length; i++) {
            if (parseInt(newData[i].timeStamp) >= sixtySecondsAgo) {
              oldestIndex = i
              break
            }
          }

          // If we have data points older than 60 seconds, keep one data point at exactly 60s
          if (oldestIndex > 0) {
            // Calculate a value for the 60s mark by interpolating between the closest points
            const olderPoint = newData[Math.max(0, oldestIndex - 1)]
            const newerPoint = newData[oldestIndex]

            const olderTime = parseInt(olderPoint.timeStamp)
            const newerTime = parseInt(newerPoint.timeStamp)

            // If we have points on both sides of the 60s mark, interpolate
            if (olderTime < sixtySecondsAgo && newerTime > sixtySecondsAgo) {
              const ratio = (sixtySecondsAgo - olderTime) / (newerTime - olderTime)
              const interpolatedValue = olderPoint.cpu + ratio * (newerPoint.cpu - olderPoint.cpu)

              // Replace all older points with just the 60s point
              newData = [{ timeStamp: sixtySecondsAgo.toString(), cpu: interpolatedValue }, ...newData.slice(oldestIndex)]
            } else {
              // Just keep points within the 60s window
              newData = newData.slice(oldestIndex - 1)
            }
          }

          // Limit the total number of points to prevent excessive memory usage
          if (newData.length > 60) {
            newData = newData.slice(newData.length - 60)
          }
        }
        return newData
      })
    }
  }, [data, historyLoaded])

  const chartConfig = {
    cpu: {
      label: "CPU",
    },
  } satisfies ChartConfig

  return (
    <Card
      className={cn({
        "bg-card/70": customBackgroundImage,
      })}
    >
      <CardContent className="px-6 py-3">
        <section className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <p className="text-md font-medium">CPU</p>
            <section className="flex items-center gap-2">
              <p className="text-xs text-end w-10 font-medium">{cpu.toFixed(2)}%</p>
              <AnimatedCircularProgressBar className="size-3 text-[0px]" max={100} min={0} value={cpu} primaryColor="hsl(var(--chart-1))" />
            </section>
          </div>
          <ChartContainer config={chartConfig} className="aspect-auto h-[130px] w-full">
            <AreaChart
              accessibilityLayer
              data={cpuChartData}
              margin={{
                top: 12,
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="timeStamp"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={200}
                interval="preserveStartEnd"
                tickFormatter={(value) => formatRelativeTime(value)}
              />
              <YAxis tickLine={false} axisLine={false} mirror={true} tickMargin={-15} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
              <Area isAnimationActive={false} dataKey="cpu" type="step" fill="hsl(var(--chart-1))" fillOpacity={0.3} stroke="hsl(var(--chart-1))" />
            </AreaChart>
          </ChartContainer>
        </section>
      </CardContent>
    </Card>
  )
}

function ProcessChart({ now, data, messageHistory }: { now: number; data: NezhaServer; messageHistory: { data: string }[] }) {
  const { t } = useTranslation()
  const [processChartData, setProcessChartData] = useState([] as processChartData[])
  const hasInitialized = useRef(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)

  const customBackgroundImage = (window.CustomBackgroundImage as string) !== "" ? window.CustomBackgroundImage : undefined

  const { process } = formatNezhaInfo(now, data)

  // 初始化历史数据
  useEffect(() => {
    if (!hasInitialized.current && messageHistory.length > 0) {
      const historyData = messageHistory
        .map((msg) => {
          const wsData = JSON.parse(msg.data) as NezhaWebsocketResponse
          const server = wsData.servers.find((s) => s.id === data.id)
          if (!server) return null
          const { process } = formatNezhaInfo(wsData.now, server)
          return {
            timeStamp: wsData.now.toString(),
            process,
          }
        })
        .filter((item): item is processChartData => item !== null)
        .reverse()

      setProcessChartData(historyData)
      hasInitialized.current = true
      setHistoryLoaded(true)
    }
  }, [messageHistory])

  // 修改实时数据更新逻辑
  useEffect(() => {
    if (data && historyLoaded) {
      const timestamp = Date.now().toString()
      setProcessChartData((prevData) => {
        let newData = [] as processChartData[]
        if (prevData.length === 0) {
          newData = [
            { timeStamp: timestamp, process },
            { timeStamp: timestamp, process },
          ]
        } else {
          newData = [...prevData, { timeStamp: timestamp, process }]

          // Ensure we keep enough data points to cover 60 seconds
          const currentTime = Date.now()
          const sixtySecondsAgo = currentTime - 60000

          // Find the oldest data point that's within the 60-second window
          let oldestIndex = 0
          for (let i = 0; i < newData.length; i++) {
            if (parseInt(newData[i].timeStamp) >= sixtySecondsAgo) {
              oldestIndex = i
              break
            }
          }

          // If we have data points older than 60 seconds, keep one data point at exactly 60s
          if (oldestIndex > 0) {
            // Calculate a value for the 60s mark by interpolating between the closest points
            const olderPoint = newData[Math.max(0, oldestIndex - 1)]
            const newerPoint = newData[oldestIndex]

            const olderTime = parseInt(olderPoint.timeStamp)
            const newerTime = parseInt(newerPoint.timeStamp)

            // If we have points on both sides of the 60s mark, interpolate
            if (olderTime < sixtySecondsAgo && newerTime > sixtySecondsAgo) {
              const ratio = (sixtySecondsAgo - olderTime) / (newerTime - olderTime)
              const interpolatedValue = olderPoint.process + ratio * (newerPoint.process - olderPoint.process)

              // Replace all older points with just the 60s point
              newData = [{ timeStamp: sixtySecondsAgo.toString(), process: Math.round(interpolatedValue) }, ...newData.slice(oldestIndex)]
            } else {
              // Just keep points within the 60s window
              newData = newData.slice(oldestIndex - 1)
            }
          }

          // Limit the total number of points to prevent excessive memory usage
          if (newData.length > 60) {
            newData = newData.slice(newData.length - 60)
          }
        }
        return newData
      })
    }
  }, [data, historyLoaded])

  // Calculate the appropriate Y-axis domain based on process count values
  const calculateYAxisDomain = () => {
    if (processChartData.length === 0) {
      return [0, 100] // Default domain if no data
    }

    // Get min and max process values
    const processValues = processChartData.map((item) => item.process)
    const maxProcess = Math.max(...processValues)
    const minProcess = Math.min(...processValues)

    // Calculate the upper bound to place the maximum value at 85% of the graph height
    // Ensure it's an integer for process counts
    const upperBound = Math.ceil(maxProcess / 0.85)

    // Calculate the lower bound based on whether the minimum value is 0 or not
    let lowerBound

    if (minProcess === 0) {
      // If minimum is 0, it should touch the bottom
      lowerBound = 0
    } else {
      // If minimum is not 0, it should be at 15% of the graph height
      // This formula calculates what value should be at the bottom of the graph
      // so that minProcess appears at 15% of the graph height
      // Ensure it's an integer for process counts
      lowerBound = Math.floor(minProcess - (minProcess * 0.15) / 0.85)
    }

    return [lowerBound, upperBound]
  }

  const yAxisDomain = calculateYAxisDomain()

  const chartConfig = {
    process: {
      label: "Process",
    },
  } satisfies ChartConfig

  return (
    <Card
      className={cn({
        "bg-card/70": customBackgroundImage,
      })}
    >
      <CardContent className="px-6 py-3">
        <section className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <p className="text-md font-medium">{t("serverDetailChart.process")}</p>
            <section className="flex items-center gap-2">
              <p className="text-xs text-end w-10 font-medium">{process}</p>
            </section>
          </div>
          <ChartContainer config={chartConfig} className="aspect-auto h-[130px] w-full">
            <AreaChart
              accessibilityLayer
              data={processChartData}
              margin={{
                top: 12,
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="timeStamp"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={200}
                interval="preserveStartEnd"
                tickFormatter={(value) => formatRelativeTime(value)}
              />
              <YAxis tickLine={false} axisLine={false} mirror={true} tickMargin={-15} domain={yAxisDomain} />
              <Area
                isAnimationActive={false}
                dataKey="process"
                type="step"
                fill="hsl(var(--chart-2))"
                fillOpacity={0.3}
                stroke="hsl(var(--chart-2))"
              />
            </AreaChart>
          </ChartContainer>
        </section>
      </CardContent>
    </Card>
  )
}

function MemChart({ now, data, messageHistory }: { now: number; data: NezhaServer; messageHistory: { data: string }[] }) {
  const { t } = useTranslation()
  const [memChartData, setMemChartData] = useState([] as memChartData[])
  const hasInitialized = useRef(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)

  const customBackgroundImage = (window.CustomBackgroundImage as string) !== "" ? window.CustomBackgroundImage : undefined

  const { mem, swap } = formatNezhaInfo(now, data)

  // 初始化历史数据
  useEffect(() => {
    if (!hasInitialized.current && messageHistory.length > 0) {
      const historyData = messageHistory
        .map((msg) => {
          const wsData = JSON.parse(msg.data) as NezhaWebsocketResponse
          const server = wsData.servers.find((s) => s.id === data.id)
          if (!server) return null
          const { mem, swap } = formatNezhaInfo(wsData.now, server)
          return {
            timeStamp: wsData.now.toString(),
            mem,
            swap,
          }
        })
        .filter((item): item is memChartData => item !== null)
        .reverse()

      setMemChartData(historyData)
      hasInitialized.current = true
      setHistoryLoaded(true)
    }
  }, [messageHistory])

  // 修改实时数据更新逻辑
  useEffect(() => {
    if (data && historyLoaded) {
      const timestamp = Date.now().toString()
      setMemChartData((prevData) => {
        let newData = [] as memChartData[]
        if (prevData.length === 0) {
          newData = [
            { timeStamp: timestamp, mem, swap },
            { timeStamp: timestamp, mem, swap },
          ]
        } else {
          newData = [...prevData, { timeStamp: timestamp, mem, swap }]

          // Ensure we keep enough data points to cover 60 seconds
          const currentTime = Date.now()
          const sixtySecondsAgo = currentTime - 60000

          // Find the oldest data point that's within the 60-second window
          let oldestIndex = 0
          for (let i = 0; i < newData.length; i++) {
            if (parseInt(newData[i].timeStamp) >= sixtySecondsAgo) {
              oldestIndex = i
              break
            }
          }

          // If we have data points older than 60 seconds, keep one data point at exactly 60s
          if (oldestIndex > 0) {
            // Calculate a value for the 60s mark by interpolating between the closest points
            const olderPoint = newData[Math.max(0, oldestIndex - 1)]
            const newerPoint = newData[oldestIndex]

            const olderTime = parseInt(olderPoint.timeStamp)
            const newerTime = parseInt(newerPoint.timeStamp)

            // If we have points on both sides of the 60s mark, interpolate
            if (olderTime < sixtySecondsAgo && newerTime > sixtySecondsAgo) {
              const ratio = (sixtySecondsAgo - olderTime) / (newerTime - olderTime)
              const interpolatedMem = olderPoint.mem + ratio * (newerPoint.mem - olderPoint.mem)
              const interpolatedSwap = olderPoint.swap + ratio * (newerPoint.swap - olderPoint.swap)

              // Replace all older points with just the 60s point
              newData = [{ timeStamp: sixtySecondsAgo.toString(), mem: interpolatedMem, swap: interpolatedSwap }, ...newData.slice(oldestIndex)]
            } else {
              // Just keep points within the 60s window
              newData = newData.slice(oldestIndex - 1)
            }
          }

          // Limit the total number of points to prevent excessive memory usage
          if (newData.length > 60) {
            newData = newData.slice(newData.length - 60)
          }
        }
        return newData
      })
    }
  }, [data, historyLoaded])

  const chartConfig = {
    mem: {
      label: "Mem",
    },
    swap: {
      label: "Swap",
    },
  } satisfies ChartConfig

  return (
    <Card
      className={cn({
        "bg-card/70": customBackgroundImage,
      })}
    >
      <CardContent className="px-6 py-3">
        <section className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <section className="flex items-center gap-4">
              <div className="flex flex-col">
                <p className=" text-xs text-muted-foreground">{t("serverDetailChart.mem")}</p>
                <div className="flex items-center gap-2">
                  <AnimatedCircularProgressBar className="size-3 text-[0px]" max={100} min={0} value={mem} primaryColor="hsl(var(--chart-8))" />
                  <p className="text-xs font-medium">{mem.toFixed(0)}%</p>
                </div>
              </div>
              <div className="flex flex-col">
                <p className=" text-xs text-muted-foreground">{t("serverDetailChart.swap")}</p>
                <div className="flex items-center gap-2">
                  <AnimatedCircularProgressBar className="size-3 text-[0px]" max={100} min={0} value={swap} primaryColor="hsl(var(--chart-10))" />
                  <p className="text-xs font-medium">{swap.toFixed(0)}%</p>
                </div>
              </div>
            </section>
            <section className="flex flex-col items-end gap-0.5">
              <div className="flex text-[11px] font-medium items-center gap-2">
                {formatBytes(data.state.mem_used)} / {formatBytes(data.host.mem_total)}
              </div>
              <div className="flex text-[11px] font-medium items-center gap-2">
                {data.host.swap_total ? (
                  <>
                    swap: {formatBytes(data.state.swap_used)} / {formatBytes(data.host.swap_total)}
                  </>
                ) : (
                  <>no swap</>
                )}
              </div>
            </section>
          </div>
          <ChartContainer config={chartConfig} className="aspect-auto h-[130px] w-full">
            <AreaChart
              accessibilityLayer
              data={memChartData}
              margin={{
                top: 12,
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="timeStamp"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={200}
                interval="preserveStartEnd"
                tickFormatter={(value) => formatRelativeTime(value)}
              />
              <YAxis tickLine={false} axisLine={false} mirror={true} tickMargin={-15} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
              <Area isAnimationActive={false} dataKey="mem" type="step" fill="hsl(var(--chart-8))" fillOpacity={0.3} stroke="hsl(var(--chart-8))" />
              <Area
                isAnimationActive={false}
                dataKey="swap"
                type="step"
                fill="hsl(var(--chart-10))"
                fillOpacity={0.3}
                stroke="hsl(var(--chart-10))"
              />
            </AreaChart>
          </ChartContainer>
        </section>
      </CardContent>
    </Card>
  )
}

function DiskChart({ now, data, messageHistory }: { now: number; data: NezhaServer; messageHistory: { data: string }[] }) {
  const { t } = useTranslation()
  const [diskChartData, setDiskChartData] = useState([] as diskChartData[])
  const hasInitialized = useRef(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)

  const customBackgroundImage = (window.CustomBackgroundImage as string) !== "" ? window.CustomBackgroundImage : undefined

  const { disk } = formatNezhaInfo(now, data)

  // 初始化历史数据
  useEffect(() => {
    if (!hasInitialized.current && messageHistory.length > 0) {
      const historyData = messageHistory
        .map((msg) => {
          const wsData = JSON.parse(msg.data) as NezhaWebsocketResponse
          const server = wsData.servers.find((s) => s.id === data.id)
          if (!server) return null
          const { disk } = formatNezhaInfo(wsData.now, server)
          return {
            timeStamp: wsData.now.toString(),
            disk,
          }
        })
        .filter((item): item is diskChartData => item !== null)
        .reverse()

      setDiskChartData(historyData)
      hasInitialized.current = true
      setHistoryLoaded(true)
    }
  }, [messageHistory])

  // 修改实时数据更新逻辑
  useEffect(() => {
    if (data && historyLoaded) {
      const timestamp = Date.now().toString()
      setDiskChartData((prevData) => {
        let newData = [] as diskChartData[]
        if (prevData.length === 0) {
          newData = [
            { timeStamp: timestamp, disk },
            { timeStamp: timestamp, disk },
          ]
        } else {
          newData = [...prevData, { timeStamp: timestamp, disk }]

          // Ensure we keep enough data points to cover 60 seconds
          const currentTime = Date.now()
          const sixtySecondsAgo = currentTime - 60000

          // Find the oldest data point that's within the 60-second window
          let oldestIndex = 0
          for (let i = 0; i < newData.length; i++) {
            if (parseInt(newData[i].timeStamp) >= sixtySecondsAgo) {
              oldestIndex = i
              break
            }
          }

          // If we have data points older than 60 seconds, keep one data point at exactly 60s
          if (oldestIndex > 0) {
            // Calculate a value for the 60s mark by interpolating between the closest points
            const olderPoint = newData[Math.max(0, oldestIndex - 1)]
            const newerPoint = newData[oldestIndex]

            const olderTime = parseInt(olderPoint.timeStamp)
            const newerTime = parseInt(newerPoint.timeStamp)

            // If we have points on both sides of the 60s mark, interpolate
            if (olderTime < sixtySecondsAgo && newerTime > sixtySecondsAgo) {
              const ratio = (sixtySecondsAgo - olderTime) / (newerTime - olderTime)
              const interpolatedValue = olderPoint.disk + ratio * (newerPoint.disk - olderPoint.disk)

              // Replace all older points with just the 60s point
              newData = [{ timeStamp: sixtySecondsAgo.toString(), disk: interpolatedValue }, ...newData.slice(oldestIndex)]
            } else {
              // Just keep points within the 60s window
              newData = newData.slice(oldestIndex - 1)
            }
          }

          // Limit the total number of points to prevent excessive memory usage
          if (newData.length > 60) {
            newData = newData.slice(newData.length - 60)
          }
        }
        return newData
      })
    }
  }, [data, historyLoaded])

  const chartConfig = {
    disk: {
      label: "Disk",
    },
  } satisfies ChartConfig

  return (
    <Card
      className={cn({
        "bg-card/70": customBackgroundImage,
      })}
    >
      <CardContent className="px-6 py-3">
        <section className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <p className="text-md font-medium">{t("serverDetailChart.disk")}</p>
            <section className="flex flex-col items-end gap-0.5">
              <section className="flex items-center gap-2">
                <p className="text-xs text-end w-10 font-medium">{disk.toFixed(0)}%</p>
                <AnimatedCircularProgressBar className="size-3 text-[0px]" max={100} min={0} value={disk} primaryColor="hsl(var(--chart-5))" />
              </section>
              <div className="flex text-[11px] font-medium items-center gap-2">
                {formatBytes(data.state.disk_used)} / {formatBytes(data.host.disk_total)}
              </div>
            </section>
          </div>
          <ChartContainer config={chartConfig} className="aspect-auto h-[130px] w-full">
            <AreaChart
              accessibilityLayer
              data={diskChartData}
              margin={{
                top: 12,
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="timeStamp"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={200}
                interval="preserveStartEnd"
                tickFormatter={(value) => formatRelativeTime(value)}
              />
              <YAxis tickLine={false} axisLine={false} mirror={true} tickMargin={-15} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
              <Area isAnimationActive={false} dataKey="disk" type="step" fill="hsl(var(--chart-5))" fillOpacity={0.3} stroke="hsl(var(--chart-5))" />
            </AreaChart>
          </ChartContainer>
        </section>
      </CardContent>
    </Card>
  )
}

function NetworkChart({ now, data, messageHistory }: { now: number; data: NezhaServer; messageHistory: { data: string }[] }) {
  const { t } = useTranslation()
  const [networkChartData, setNetworkChartData] = useState([] as networkChartData[])
  const hasInitialized = useRef(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)

  const customBackgroundImage = (window.CustomBackgroundImage as string) !== "" ? window.CustomBackgroundImage : undefined

  const { up, down } = formatNezhaInfo(now, data)

  // 初始化历史数据
  useEffect(() => {
    if (!hasInitialized.current && messageHistory.length > 0) {
      const historyData = messageHistory
        .map((msg) => {
          const wsData = JSON.parse(msg.data) as NezhaWebsocketResponse
          const server = wsData.servers.find((s) => s.id === data.id)
          if (!server) return null
          const { up, down } = formatNezhaInfo(wsData.now, server)
          return {
            timeStamp: wsData.now.toString(),
            upload: up,
            download: down,
          }
        })
        .filter((item): item is networkChartData => item !== null)
        .reverse()

      setNetworkChartData(historyData)
      hasInitialized.current = true
      setHistoryLoaded(true)
    }
  }, [messageHistory])

  // 修改实时数据更新逻辑
  useEffect(() => {
    if (data && historyLoaded) {
      const timestamp = Date.now().toString()
      setNetworkChartData((prevData) => {
        let newData = [] as networkChartData[]
        if (prevData.length === 0) {
          newData = [
            { timeStamp: timestamp, upload: up, download: down },
            { timeStamp: timestamp, upload: up, download: down },
          ]
        } else {
          newData = [...prevData, { timeStamp: timestamp, upload: up, download: down }]

          // Ensure we keep enough data points to cover 60 seconds
          const currentTime = Date.now()
          const sixtySecondsAgo = currentTime - 60000

          // Find the oldest data point that's within the 60-second window
          let oldestIndex = 0
          for (let i = 0; i < newData.length; i++) {
            if (parseInt(newData[i].timeStamp) >= sixtySecondsAgo) {
              oldestIndex = i
              break
            }
          }

          // If we have data points older than 60 seconds, keep one data point at exactly 60s
          if (oldestIndex > 0) {
            // Calculate a value for the 60s mark by interpolating between the closest points
            const olderPoint = newData[Math.max(0, oldestIndex - 1)]
            const newerPoint = newData[oldestIndex]

            const olderTime = parseInt(olderPoint.timeStamp)
            const newerTime = parseInt(newerPoint.timeStamp)

            // If we have points on both sides of the 60s mark, interpolate
            if (olderTime < sixtySecondsAgo && newerTime > sixtySecondsAgo) {
              const ratio = (sixtySecondsAgo - olderTime) / (newerTime - olderTime)
              const interpolatedUpload = olderPoint.upload + ratio * (newerPoint.upload - olderPoint.upload)
              const interpolatedDownload = olderPoint.download + ratio * (newerPoint.download - olderPoint.download)

              // Replace all older points with just the 60s point
              newData = [
                { timeStamp: sixtySecondsAgo.toString(), upload: interpolatedUpload, download: interpolatedDownload },
                ...newData.slice(oldestIndex),
              ]
            } else {
              // Just keep points within the 60s window
              newData = newData.slice(oldestIndex - 1)
            }
          }

          // Limit the total number of points to prevent excessive memory usage
          if (newData.length > 60) {
            newData = newData.slice(newData.length - 60)
          }
        }
        return newData
      })
    }
  }, [data, historyLoaded])

  // Calculate the appropriate Y-axis domain based on network traffic values
  const calculateYAxisDomain = () => {
    if (networkChartData.length === 0) {
      return [0, 1] // Default domain if no data
    }

    // Get max values for both upload and download
    const uploadValues = networkChartData.map((item) => item.upload)
    const downloadValues = networkChartData.map((item) => item.download)

    // Find the overall max and min values
    const maxUpload = Math.max(...uploadValues)
    const maxDownload = Math.max(...downloadValues)
    const maxValue = Math.max(maxUpload, maxDownload)

    const minUpload = Math.min(...uploadValues)
    const minDownload = Math.min(...downloadValues)
    const minValue = Math.min(minUpload, minDownload)

    // Calculate the upper bound to place the maximum value at 85% of the graph height
    const upperBound = Math.ceil(maxValue / 0.85)

    // Calculate the lower bound based on whether the minimum value is 0 or not
    let lowerBound

    if (minValue === 0) {
      // If minimum is 0, it should touch the bottom
      lowerBound = 0
    } else {
      // If minimum is not 0, it should be at 15% of the graph height
      lowerBound = Math.max(0.1, minValue - (minValue * 0.15) / 0.85)
    }

    // Ensure we have at least a minimum value of 0.1 for the lower bound if not zero
    // This prevents issues with logarithmic scales or very small values
    return [lowerBound, upperBound]
  }

  const yAxisDomain = calculateYAxisDomain()

  const chartConfig = {
    upload: {
      label: "Upload",
    },
    download: {
      label: "Download",
    },
  } satisfies ChartConfig

  return (
    <Card
      className={cn({
        "bg-card/70": customBackgroundImage,
      })}
    >
      <CardContent className="px-6 py-3">
        <section className="flex flex-col gap-1">
          <div className="flex items-center">
            <section className="flex items-center gap-4">
              <div className="flex flex-col w-20">
                <p className="text-xs text-muted-foreground">{t("serverDetailChart.upload")}</p>
                <div className="flex items-center gap-1">
                  <span className="relative inline-flex  size-1.5 rounded-full bg-[hsl(var(--chart-1))]"></span>
                  <p className="text-xs font-medium">
                    {up >= 1024 ? `${(up / 1024).toFixed(2)}G/s` : up >= 1 ? `${up.toFixed(2)}M/s` : `${(up * 1024).toFixed(2)}K/s`}
                  </p>
                </div>
              </div>
              <div className="flex flex-col w-20">
                <p className=" text-xs text-muted-foreground">{t("serverDetailChart.download")}</p>
                <div className="flex items-center gap-1">
                  <span className="relative inline-flex  size-1.5 rounded-full bg-[hsl(var(--chart-4))]"></span>
                  <p className="text-xs font-medium">
                    {down >= 1024 ? `${(down / 1024).toFixed(2)}G/s` : down >= 1 ? `${down.toFixed(2)}M/s` : `${(down * 1024).toFixed(2)}K/s`}
                  </p>
                </div>
              </div>
            </section>
          </div>
          <ChartContainer config={chartConfig} className="aspect-auto h-[130px] w-full">
            <LineChart
              accessibilityLayer
              data={networkChartData}
              margin={{
                top: 12,
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="timeStamp"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={200}
                interval="preserveStartEnd"
                tickFormatter={(value) => formatRelativeTime(value)}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                mirror={true}
                tickMargin={-15}
                type="number"
                minTickGap={50}
                interval="preserveStartEnd"
                domain={yAxisDomain}
                tickFormatter={(value) => `${value.toFixed(0)}M/s`}
              />
              <Line isAnimationActive={false} dataKey="upload" type="linear" stroke="hsl(var(--chart-1))" strokeWidth={1} dot={false} />
              <Line isAnimationActive={false} dataKey="download" type="linear" stroke="hsl(var(--chart-4))" strokeWidth={1} dot={false} />
            </LineChart>
          </ChartContainer>
        </section>
      </CardContent>
    </Card>
  )
}

function ConnectChart({ now, data, messageHistory }: { now: number; data: NezhaServer; messageHistory: { data: string }[] }) {
  const [connectChartData, setConnectChartData] = useState([] as connectChartData[])
  const hasInitialized = useRef(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)

  const customBackgroundImage = (window.CustomBackgroundImage as string) !== "" ? window.CustomBackgroundImage : undefined

  const { tcp, udp } = formatNezhaInfo(now, data)

  // 初始化历史数据
  useEffect(() => {
    if (!hasInitialized.current && messageHistory.length > 0) {
      const historyData = messageHistory
        .map((msg) => {
          const wsData = JSON.parse(msg.data) as NezhaWebsocketResponse
          const server = wsData.servers.find((s) => s.id === data.id)
          if (!server) return null
          const { tcp, udp } = formatNezhaInfo(wsData.now, server)
          return {
            timeStamp: wsData.now.toString(),
            tcp,
            udp,
          }
        })
        .filter((item): item is connectChartData => item !== null)
        .reverse()

      setConnectChartData(historyData)
      hasInitialized.current = true
      setHistoryLoaded(true)
    }
  }, [messageHistory])

  // 修改实时数据更新逻辑
  useEffect(() => {
    if (data && historyLoaded) {
      const timestamp = Date.now().toString()
      setConnectChartData((prevData) => {
        let newData = [] as connectChartData[]
        if (prevData.length === 0) {
          newData = [
            { timeStamp: timestamp, tcp, udp },
            { timeStamp: timestamp, tcp, udp },
          ]
        } else {
          newData = [...prevData, { timeStamp: timestamp, tcp, udp }]

          // Ensure we keep enough data points to cover 60 seconds
          const currentTime = Date.now()
          const sixtySecondsAgo = currentTime - 60000

          // Find the oldest data point that's within the 60-second window
          let oldestIndex = 0
          for (let i = 0; i < newData.length; i++) {
            if (parseInt(newData[i].timeStamp) >= sixtySecondsAgo) {
              oldestIndex = i
              break
            }
          }

          // If we have data points older than 60 seconds, keep one data point at exactly 60s
          if (oldestIndex > 0) {
            // Calculate a value for the 60s mark by interpolating between the closest points
            const olderPoint = newData[Math.max(0, oldestIndex - 1)]
            const newerPoint = newData[oldestIndex]

            const olderTime = parseInt(olderPoint.timeStamp)
            const newerTime = parseInt(newerPoint.timeStamp)

            // If we have points on both sides of the 60s mark, interpolate
            if (olderTime < sixtySecondsAgo && newerTime > sixtySecondsAgo) {
              const ratio = (sixtySecondsAgo - olderTime) / (newerTime - olderTime)
              const interpolatedTcp = Math.round(olderPoint.tcp + ratio * (newerPoint.tcp - olderPoint.tcp))
              const interpolatedUdp = Math.round(olderPoint.udp + ratio * (newerPoint.udp - olderPoint.udp))

              // Replace all older points with just the 60s point
              newData = [{ timeStamp: sixtySecondsAgo.toString(), tcp: interpolatedTcp, udp: interpolatedUdp }, ...newData.slice(oldestIndex)]
            } else {
              // Just keep points within the 60s window
              newData = newData.slice(oldestIndex - 1)
            }
          }

          // Limit the total number of points to prevent excessive memory usage
          if (newData.length > 60) {
            newData = newData.slice(newData.length - 60)
          }
        }
        return newData
      })
    }
  }, [data, historyLoaded])

  // Calculate the appropriate Y-axis domain based on connection count values
  const calculateYAxisDomain = () => {
    if (connectChartData.length === 0) {
      return [0, 100] // Default domain if no data
    }

    // Get max and min values for both TCP and UDP
    const tcpValues = connectChartData.map((item) => item.tcp)
    const udpValues = connectChartData.map((item) => item.udp)

    // Find the overall max and min values
    const maxTcp = Math.max(...tcpValues)
    const maxUdp = Math.max(...udpValues)
    const maxValue = Math.max(maxTcp, maxUdp)

    const minTcp = Math.min(...tcpValues)
    const minUdp = Math.min(...udpValues)
    const minValue = Math.min(minTcp, minUdp)

    // Calculate the upper bound to place the maximum value at 85% of the graph height
    // Ensure it's an integer for connection counts
    const upperBound = Math.ceil(maxValue / 0.85)

    // Calculate the lower bound based on whether the minimum value is 0 or not
    let lowerBound

    if (minValue === 0) {
      // If minimum is 0, it should touch the bottom
      lowerBound = 0
    } else {
      // If minimum is not 0, it should be at 15% of the graph height
      // Ensure it's an integer for connection counts
      lowerBound = Math.floor(minValue - (minValue * 0.15) / 0.85)
    }

    return [lowerBound, upperBound]
  }

  const yAxisDomain = calculateYAxisDomain()

  const chartConfig = {
    tcp: {
      label: "TCP",
    },
    udp: {
      label: "UDP",
    },
  } satisfies ChartConfig

  return (
    <Card
      className={cn({
        "bg-card/70": customBackgroundImage,
      })}
    >
      <CardContent className="px-6 py-3">
        <section className="flex flex-col gap-1">
          <div className="flex items-center">
            <section className="flex items-center gap-4">
              <div className="flex flex-col w-12">
                <p className="text-xs text-muted-foreground">TCP</p>
                <div className="flex items-center gap-1">
                  <span className="relative inline-flex  size-1.5 rounded-full bg-[hsl(var(--chart-1))]"></span>
                  <p className="text-xs font-medium">{tcp}</p>
                </div>
              </div>
              <div className="flex flex-col w-12">
                <p className=" text-xs text-muted-foreground">UDP</p>
                <div className="flex items-center gap-1">
                  <span className="relative inline-flex  size-1.5 rounded-full bg-[hsl(var(--chart-4))]"></span>
                  <p className="text-xs font-medium">{udp}</p>
                </div>
              </div>
            </section>
          </div>
          <ChartContainer config={chartConfig} className="aspect-auto h-[130px] w-full">
            <LineChart
              accessibilityLayer
              data={connectChartData}
              margin={{
                top: 12,
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="timeStamp"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={200}
                interval="preserveStartEnd"
                tickFormatter={(value) => formatRelativeTime(value)}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                mirror={true}
                tickMargin={-15}
                type="number"
                interval="preserveStartEnd"
                domain={yAxisDomain}
              />
              <Line isAnimationActive={false} dataKey="tcp" type="linear" stroke="hsl(var(--chart-1))" strokeWidth={1} dot={false} />
              <Line isAnimationActive={false} dataKey="udp" type="linear" stroke="hsl(var(--chart-4))" strokeWidth={1} dot={false} />
            </LineChart>
          </ChartContainer>
        </section>
      </CardContent>
    </Card>
  )
}
