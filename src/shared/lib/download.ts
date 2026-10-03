export function downloadFile(name: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

export function fileStamp(date = new Date()): string {
  return date.toISOString().slice(0, 19).replace(/:/g, '')
}
