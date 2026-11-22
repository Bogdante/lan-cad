// Состояние проекта и действия над ним.
// project — проектные данные (то, что сохраняется в JSON).
// ui — состояние интерфейса (выбранный инструмент, выделение и т. п.), в JSON не попадает.
import { reactive, computed } from 'vue'
import { CATALOG } from './catalog.js'
import { dist, listSegments, projectOnSegment, findCablePath, cableLength, polylineLength } from './geometry.js'

/** Нормы проекта и параметры расчёта по умолчанию (статическая информация). */
export const DEFAULT_PARAMS = {
  L_lin: 90,      // R1: предельная длина стационарной линии, м
  L_kan: 100,     // R2: предельная длина канала, м
  K_rez: 20,      // R5: минимальный резерв портов, %
  K_zap: 40,      // R8: допустимое заполнение лотка, %
  hTray: 2.9,     // высота трассы над полом, м
  hOutlet: 0.3,   // высота установки розетки, м
  hCab: 2,        // кабель от ввода в шкаф до патч-панели, м
  reserve: 3,     // технологический запас, м
  cordCab: 1,     // коммутационный шнур в шкафу, м
  cordWp: 2,      // абонентский шнур на рабочем месте, м
  cableD: 6,      // наружный диаметр кабеля, мм
  maxAttachM: 3,  // насколько далеко от лотка может стоять розетка или шкаф, м
}

export function emptyProject() {
  return {
    name: 'Новый проект',
    version: 1,
    plan: { imageUrl: null, widthPx: 1000, heightPx: 800, metersPerPx: 0.025, floorHeightM: 3.2 },
    params: { ...DEFAULT_PARAMS },
    disabledRules: [],
    elements: [],   // розетки, точки доступа, шкафы, лотки
    links: [],      // кабельные линии: { id, from, port, to }
  }
}

export const project = reactive(emptyProject())

export const ui = reactive({
  tool: 'select',      // select | outlet | ap | cabinet | tray | link | calibrate | delete
  selectedId: null,
  tab: 'tools',        // вкладка правой панели
  zoom: 1,
  draftTray: [],       // точки лотка, который сейчас рисуется
  linkStart: null,     // розетка, с которой начали прокладку линии
  calibPoints: [],     // две точки калибровки
  report: null,        // последний отчёт проверки
})

/** Заменить проект целиком (пример, открытие файла). */
export function loadProject(data) {
  Object.assign(project, emptyProject(), data)
  project.params = { ...DEFAULT_PARAMS, ...(data.params || {}) }
  ui.selectedId = null
  ui.report = null
  ui.draftTray = []
  ui.linkStart = null
}

// ---------- поиск и создание элементов ----------

export const findElement = (id) => project.elements.find((e) => e.id === id)
export const elementsOfKind = (kind) => project.elements.filter((e) => e.kind === kind)

const PREFIX = { outlet: 'TO', ap: 'AP', cabinet: 'CAB', tray: 'TR' }

/** Следующий свободный номер: TO-01, TO-02, ... */
function nextLabel(kind) {
  const used = new Set(project.elements.map((e) => e.id))
  let n = 1
  while (used.has(`${PREFIX[kind]}-${String(n).padStart(2, '0')}`)) n++
  return `${PREFIX[kind]}-${String(n).padStart(2, '0')}`
}

/** Разместить точечный элемент (розетку, точку доступа, шкаф). */
export function addPointElement(kind, x, y) {
  const id = nextLabel(kind)
  const element = { id, kind, x: Math.round(x), y: Math.round(y) }
  if (kind === 'outlet') element.ports = CATALOG.outlet.ports
  if (kind === 'ap') element.ports = CATALOG.ap.ports
  if (kind === 'cabinet') element.devices = []
  project.elements.push(element)
  ui.selectedId = id
  return element
}

export function moveElement(id, x, y) {
  const el = findElement(id)
  if (el && el.kind !== 'tray') {
    el.x = Math.round(x)
    el.y = Math.round(y)
  }
}

/** Удалить элемент и все кабельные линии, которые к нему подключены. */
export function removeElement(id) {
  project.elements = project.elements.filter((e) => e.id !== id)
  project.links = project.links.filter((l) => l.from !== id && l.to !== id)
  if (ui.selectedId === id) ui.selectedId = null
}

// ---------- шкаф и его содержимое ----------

export function addDevice(cabinetId, catalogKey) {
  const cabinet = findElement(cabinetId)
  cabinet.devices.push({ type: catalogKey })
}

export function removeDevice(cabinetId, index) {
  findElement(cabinetId).devices.splice(index, 1)
}

/** Сколько портов определённого вида в шкафу (коммутаторы или патч-панели). */
export function cabinetPorts(cabinet, kind) {
  return cabinet.devices
    .filter((d) => (kind === 'switch' ? d.type.startsWith('switch') : d.type === kind))
    .reduce((sum, d) => sum + CATALOG[d.type].ports, 0)
}

// ---------- лотки ----------

const SNAP_PX = 12

/**
 * Точка нового лотка «примагничивается» к существующим лоткам:
 * к их вершинам или к середине отрезка (тогда в отрезок вставляется вершина).
 * Так лотки получают общие вершины и соединяются в одну сеть.
 */
function snapToTrays(p) {
  for (const tray of elementsOfKind('tray')) {
    for (const v of tray.points) if (dist(p, v) < SNAP_PX) return { x: v.x, y: v.y }
  }
  for (const tray of elementsOfKind('tray')) {
    for (let i = 1; i < tray.points.length; i++) {
      const proj = projectOnSegment(p, tray.points[i - 1], tray.points[i])
      if (proj.distance < SNAP_PX && proj.t > 0 && proj.t < 1) {
        const v = { x: Math.round(proj.point.x), y: Math.round(proj.point.y) }
        tray.points.splice(i, 0, v)
        return v
      }
    }
  }
  return { x: Math.round(p.x), y: Math.round(p.y) }
}

export function addDraftTrayPoint(x, y) {
  ui.draftTray.push(snapToTrays({ x, y }))
}

export function finishTray() {
  // двойной щелчок даёт две одинаковые точки подряд — убираем повторы
  ui.draftTray = ui.draftTray.filter((p, i, arr) => i === 0 || dist(p, arr[i - 1]) > 0)
  if (ui.draftTray.length >= 2) {
    const id = nextLabel('tray')
    project.elements.push({ id, kind: 'tray', size: 'tray100', points: ui.draftTray })
    ui.selectedId = id
  }
  ui.draftTray = []
}

// ---------- кабельные линии ----------

/** Подключить все свободные порты розетки к шкафу. */
export function connectOutlet(outletId, cabinetId) {
  const outlet = findElement(outletId)
  for (let port = 1; port <= outlet.ports; port++) {
    const busy = project.links.some((l) => l.from === outletId && l.port === port)
    if (!busy) project.links.push({ id: `${outletId}/${port}`, from: outletId, port, to: cabinetId })
  }
}

/** Подключить все розетки и точки доступа к ближайшему шкафу. */
export function connectAll() {
  const cabinets = elementsOfKind('cabinet')
  if (cabinets.length === 0) return
  for (const el of project.elements) {
    if (el.kind !== 'outlet' && el.kind !== 'ap') continue
    const nearest = cabinets.reduce((a, b) => (dist(el, a) <= dist(el, b) ? a : b))
    connectOutlet(el.id, nearest.id)
  }
}

export function clearLinks() {
  project.links = []
}

// ---------- калибровка масштаба ----------

export function applyCalibration(distanceM) {
  const [a, b] = ui.calibPoints
  const px = dist(a, b)
  if (px > 0 && distanceM > 0) project.plan.metersPerPx = distanceM / px
  ui.calibPoints = []
}

// ---------- вычисляемые данные (пересчитываются автоматически) ----------

/** Отрезки всех лотков. */
export const segments = computed(() => listSegments(elementsOfKind('tray')))

/** Кабельные линии с путём по лоткам и длинами. */
export const cableLinks = computed(() => {
  const k = project.plan.metersPerPx
  const maxAttachPx = project.params.maxAttachM / k
  return project.links.map((link) => {
    const from = findElement(link.from)
    const to = findElement(link.to)
    const path = from && to ? findCablePath(from, to, segments.value, maxAttachPx) : null
    const lengths = path ? cableLength(path, k, project.params) : null
    return {
      ...link,
      routed: Boolean(path),
      points: path ? path.points : [from, to],
      segmentKeys: path ? path.segmentKeys : [],
      length: lengths?.length ?? null,
      channel: lengths?.channel ?? null,
    }
  })
})

/** Заполнение каждого отрезка лотка, % (сумма сечений кабелей / сечение лотка). */
export const trayFill = computed(() => {
  const cableArea = Math.PI * (project.params.cableD / 2) ** 2   // мм²
  const count = {}
  for (const link of cableLinks.value) {
    for (const key of link.segmentKeys) count[key] = (count[key] || 0) + 1
  }
  return segments.value.map((s) => {
    const tray = findElement(s.routeId)
    const size = CATALOG[tray.size]
    const cables = count[s.key] || 0
    return { ...s, cables, fill: Math.round((cables * cableArea) / (size.w * size.h) * 1000) / 10 }
  })
})

/** Сводка для строки состояния. */
export const summary = computed(() => {
  const routed = cableLinks.value.filter((l) => l.routed)
  const total = routed.reduce((s, l) => s + l.length, 0)
  return {
    outlets: elementsOfKind('outlet').length + elementsOfKind('ap').length,
    links: project.links.length,
    totalM: Math.round(total),
    maxM: routed.length ? Math.max(...routed.map((l) => l.length)) : 0,
    trayM: Math.round(elementsOfKind('tray').reduce((s, t) => s + polylineLength(t.points), 0) * project.plan.metersPerPx),
  }
})
