/**
 * In-browser virtual pasted files (stub mode when no API server).
 */

const pastedTexts = new Map<string, Map<string, string>>()

function bucket(subChatId: string): Map<string, string> {
  let map = pastedTexts.get(subChatId)
  if (!map) {
    map = new Map()
    pastedTexts.set(subChatId, map)
  }
  return map
}

export function writePastedText(input: {
  subChatId: string
  text: string
  filename?: string
}): { filePath: string; filename: string; size: number } {
  const filename = input.filename || `pasted_${Date.now()}.txt`
  const filePath = `web-pasted/${input.subChatId}/${filename}`
  bucket(input.subChatId).set(filePath, input.text)
  return { filePath, filename, size: input.text.length }
}

export function readVirtualText(filePath: string): string | null {
  for (const map of pastedTexts.values()) {
    const content = map.get(filePath)
    if (content !== undefined) return content
  }
  return null
}
