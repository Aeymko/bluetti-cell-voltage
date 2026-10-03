const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'medium' })
const time = new Intl.DateTimeFormat(undefined, { timeStyle: 'medium' })

export const formatDateTime = (ts: number) => dateTime.format(ts)
export const formatTime = (ts: number) => time.format(ts)
export const formatVolts = (mv: number, digits = 3) => `${(mv / 1000).toFixed(digits)} V`
