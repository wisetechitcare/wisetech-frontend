import {FC} from 'react'
import {useLang} from './Metronici18n'
import {IntlProvider} from 'react-intl'
// The @formatjs/intl-relativetimeformat polyfill and its six locale-data imports were
// removed. They were Metronic template boilerplate for a feature this app never uses:
// react-intl's <FormattedRelativeTime> appears nowhere, and the one formatRelativeTime
// helper (leads/dms/utils) is hand-rolled arithmetic that never touches
// Intl.RelativeTimeFormat. Intl.RelativeTimeFormat has also been native in every target
// browser since 2020.
//
// They also broke the production build: Vite could not resolve the "./polyfill" subpath on
// the Linux CI runner, while the same lockfile resolved it fine on Windows. Deleting dead
// imports beats adding a resolver workaround for code nothing calls.

import deMessages from './messages/de.json'
import enMessages from './messages/en.json'
import esMessages from './messages/es.json'
import frMessages from './messages/fr.json'
import jaMessages from './messages/ja.json'
import zhMessages from './messages/zh.json'
import {WithChildren} from '../helpers'

const allMessages = {
  de: deMessages,
  en: enMessages,
  es: esMessages,
  fr: frMessages,
  ja: jaMessages,
  zh: zhMessages,
}

const I18nProvider: FC<WithChildren> = ({children}) => {
  const locale = useLang()
  const messages = allMessages[locale]

  return (
    <IntlProvider locale={locale} messages={messages}>
      {children}
    </IntlProvider>
  )
}

export {I18nProvider}
