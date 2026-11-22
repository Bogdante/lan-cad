// Сохранение проекта в JSON и открытие из JSON.
// Формат соответствует приложению А пояснительной записки.

/** Собирает JSON-документ версии проекта. Длины линий добавляются как расчётные поля. */
export function projectToJson(project, cableLinks, report) {
  const data = {
    project: project.name,
    version: { number: project.version, status: 'draft', savedAt: new Date().toISOString() },
    floorPlan: { ...project.plan },
    params: project.params,
    disabledRules: project.disabledRules,
    elements: project.elements,
    links: cableLinks.map((l) => ({
      id: l.id, from: `${l.from}/${l.port}`, to: l.to, category: '6',
      routes: [...new Set(l.segmentKeys.map((k) => k.split(':')[0]))],
      lengthM: l.length, channelM: l.channel,
    })),
    validation: report ? { errors: report.errors, warnings: report.warnings, items: report.items } : null,
  }
  return JSON.stringify(data, null, 2)
}

/** Разбирает JSON и возвращает данные для loadProject(). */
export function jsonToProject(text) {
  const data = JSON.parse(text)
  return {
    name: data.project,
    version: (data.version?.number || 0) + 1,
    plan: data.floorPlan,
    params: data.params,
    disabledRules: data.disabledRules || [],
    elements: data.elements,
    links: data.links.map((l) => {
      const [from, port] = l.from.split('/')
      return { id: l.id, from, port: Number(port), to: l.to }
    }),
  }
}

/** Скачать текст как файл (без сервера, средствами браузера). */
export function downloadText(text, fileName) {
  const blob = new Blob([text], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = fileName
  a.click()
  URL.revokeObjectURL(a.href)
}
