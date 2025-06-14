import { useEffect, useState } from "react"

declare global {
  interface Window {
    CustomBackgroundImage: string
    CustomMobileBackgroundImage: string
    CustomLogo: string
    CustomDesc: string
    CustomLinks: string
    CustomIllustration: string
    ForceTheme: string
    ForceShowServices: boolean
    ForceCardInline: boolean
    ForceShowMap: boolean
    ForcePeakCutEnabled: boolean
    ForceUseSvgFlag: boolean
    DisableAnimatedMan: boolean
  }
}

const BACKGROUND_CHANGE_EVENT = "backgroundChange"

export function useBackground() {
  const [backgroundImage, setBackgroundImage] = useState<string | undefined>(undefined)

  useEffect(() => {
    // 监听背景变化
    const handleBackgroundChange = () => {
      setBackgroundImage(window.CustomBackgroundImage || import.meta.env.VITE_CUSTOM_BACKGROUND_IMAGE || undefined)
    }

    // 初始化检查
    const checkInitialBackground = () => {
      if (window.CustomBackgroundImage) {
        setBackgroundImage(window.CustomBackgroundImage)
      } else if (import.meta.env.VITE_CUSTOM_BACKGROUND_IMAGE) {
        window.CustomBackgroundImage = import.meta.env.VITE_CUSTOM_BACKGROUND_IMAGE
        setBackgroundImage(import.meta.env.VITE_CUSTOM_BACKGROUND_IMAGE)
      } else {
        const savedImage = sessionStorage.getItem("savedBackgroundImage")
        if (savedImage) {
          window.CustomBackgroundImage = savedImage
          setBackgroundImage(savedImage)
        }
      }
    }

    // 设置一个轮询来检查初始背景
    const intervalId = setInterval(() => {
      if (window.CustomBackgroundImage || sessionStorage.getItem("savedBackgroundImage")) {
        checkInitialBackground()
        clearInterval(intervalId)
      }
    }, 100)

    window.addEventListener(BACKGROUND_CHANGE_EVENT, handleBackgroundChange)

    return () => {
      window.removeEventListener(BACKGROUND_CHANGE_EVENT, handleBackgroundChange)
      clearInterval(intervalId)
    }
  }, [])

  const updateBackground = (newBackground: string | undefined) => {
    window.CustomBackgroundImage = newBackground || ""
    window.dispatchEvent(new Event(BACKGROUND_CHANGE_EVENT))
  }

  return { backgroundImage, updateBackground }
}
