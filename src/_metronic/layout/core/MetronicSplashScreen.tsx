import React, {
  createContext,
  Dispatch,
  FC,
  SetStateAction,
  useEffect,
  useState,
} from 'react'
import {WithChildren} from '../../helpers'
import {holdSplash} from '@utils/splashGate'

const MetronicSplashScreenContext = createContext<Dispatch<SetStateAction<number>> | undefined>(
  undefined
)

const MetronicSplashScreenProvider: FC<WithChildren> = ({children}) => {
  const [count, setCount] = useState(0)
  const visible = count > 0

  useEffect(() => {
    // Show SplashScreen
    if (visible) {
      document.body.classList.remove('page-loading')

      return () => {
        document.body.classList.add('page-loading')
      }
    }

    // Hide SplashScreen
    let timeout: number
    if (!visible) {
      timeout = window.setTimeout(() => {
        document.body.classList.add('page-loading')
      }, 3000)
    }

    return () => {
      clearTimeout(timeout)
    }
  }, [visible])

  return (
    <MetronicSplashScreenContext.Provider value={setCount}>
      {children}
    </MetronicSplashScreenContext.Provider>
  )
}

/**
 * Keeps the startup splash up while it is mounted (App's top-level Suspense fallback, AuthInit's session check).
 * It used to count into MetronicSplashScreenProvider, which nothing mounts, so it did nothing at all.
 */
const LayoutSplashScreen: FC<{visible?: boolean}> = ({visible = true}) => {
  useEffect(() => (visible ? holdSplash() : undefined), [visible])
  return null
}

export {MetronicSplashScreenProvider, LayoutSplashScreen}
