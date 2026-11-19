/* eslint-disable react-refresh/only-export-components */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {FC, createContext, useContext, useState, useEffect} from 'react'
import {DefaultLayoutConfig} from './DefaultLayoutConfig'
import {
  getEmptyCssClasses,
  getEmptyCSSVariables,
  getEmptyHTMLAttributes,
  LayoutSetup,
} from './LayoutSetup'
import {
  ILayout,
  ILayoutCSSVariables,
  ILayoutCSSClasses,
  ILayoutHTMLAttributes,
} from './LayoutModels'
import {WithChildren} from '../../helpers'
import {requestSplashHide} from '@utils/splashGate'

export interface LayoutContextModel {
  config: ILayout
  classes: ILayoutCSSClasses
  attributes: ILayoutHTMLAttributes
  cssVariables: ILayoutCSSVariables
  setLayout: (config: LayoutSetup) => void
}

const LayoutContext = createContext<LayoutContextModel>({
  config: DefaultLayoutConfig,
  classes: getEmptyCssClasses(),
  attributes: getEmptyHTMLAttributes(),
  cssVariables: getEmptyCSSVariables(),
  setLayout: (config: LayoutSetup) => {},
})

const enableSplashScreen = () => {
  const splashScreen = document.getElementById('splash-screen')
  // A video splash plays once at startup; a layout change must not bring back its last frame.
  if (splashScreen && !splashScreen.classList.contains('splash--has-video')) {
    splashScreen.style.setProperty('display', 'flex')
  }
}

// The splash is held until the first route has loaded, and until an organization video has finished (utils/splashGate).
const disableSplashScreen = () => requestSplashHide()

const LayoutProvider: FC<WithChildren> = ({children}) => {
  const [config, setConfig] = useState(LayoutSetup.config)
  const [classes, setClasses] = useState(LayoutSetup.classes)
  const [attributes, setAttributes] = useState(LayoutSetup.attributes)
  const [cssVariables, setCSSVariables] = useState(LayoutSetup.cssVariables)
  const setLayout = (_themeConfig: Partial<ILayout>) => {
    enableSplashScreen()
    const bodyClasses = Array.from(document.body.classList)
    bodyClasses.forEach((cl) => document.body.classList.remove(cl))
    LayoutSetup.updatePartialConfig(_themeConfig)
    setConfig(Object.assign({}, LayoutSetup.config))
    setClasses(LayoutSetup.classes)
    setAttributes(LayoutSetup.attributes)
    setCSSVariables(LayoutSetup.cssVariables)
    setTimeout(() => {
      disableSplashScreen()
    }, 500)
  }
  const value: LayoutContextModel = {
    config,
    classes,
    attributes,
    cssVariables,
    setLayout,
  }

  useEffect(() => {
    disableSplashScreen()
  }, [])

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
}

export {LayoutContext, LayoutProvider}

export function useLayout() {
  return useContext(LayoutContext)
}
