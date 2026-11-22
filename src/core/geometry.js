// Геометрия плана: расстояния, сеть кабельных трасс и поиск пути по ней.
// Все координаты здесь в пикселях плана. В метры их переводит функция cableLength().

/** Расстояние между двумя точками {x, y} в пикселях. */
export function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/** Длина полилинии (массива точек) в пикселях. */
export function polylineLength(points) {
  let sum = 0
  for (let i = 1; i < points.length; i++) sum += dist(points[i - 1], points[i])
  return sum
}

/**
 * Ближайшая к точке p точка отрезка [a, b].
 * t — положение на отрезке (0 — точка a, 1 — точка b).
 */
export function projectOnSegment(p, a, b) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  let t = len2 === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  const point = { x: a.x + t * dx, y: a.y + t * dy }
  return { point, t, distance: dist(p, point) }
}

// ---------- сеть лотков ----------
// Лотки, нарисованные на плане, превращаются в набор отрезков.
// Два лотка считаются соединёнными, если:
//   • у них есть общая точка;
//   • конец одного лотка лежит рядом с другим лотком (ближе JOIN_PX);
//   • лотки пересекаются.
// В местах соединения отрезки разрезаются, чтобы там появилась общая вершина графа.

const JOIN_PX = 12

/** Точка пересечения отрезков [a, b] и [c, d] или null, если они не пересекаются. */
function intersect(a, b, c, d) {
  const r = { x: b.x - a.x, y: b.y - a.y }
  const q = { x: d.x - c.x, y: d.y - c.y }
  const cross = r.x * q.y - r.y * q.x
  if (Math.abs(cross) < 1e-9) return null            // параллельны
  const t = ((c.x - a.x) * q.y - (c.y - a.y) * q.x) / cross
  const u = ((c.x - a.x) * r.y - (c.y - a.y) * r.x) / cross
  // небольшой допуск: конец лотка, притянутый к соседнему, лежит ровно на границе
  // отрезка, и из-за округления дробных чисел t или u может выйти чуть меньше 0
  const EPS = 1e-6
  if (t < -EPS || t > 1 + EPS || u < -EPS || u > 1 + EPS) return null
  return { x: a.x + t * r.x, y: a.y + t * r.y }
}

/** Конец лотка, лежащий рядом с другим лотком, переносим точно на этот лоток. */
function joinEnd(p, routeId, routes) {
  let best = null
  for (const other of routes) {
    if (other.id === routeId) continue
    for (let i = 1; i < other.points.length; i++) {
      const proj = projectOnSegment(p, other.points[i - 1], other.points[i])
      if (proj.distance < JOIN_PX && (!best || proj.distance < best.distance)) best = proj
    }
  }
  return best ? best.point : p
}

/**
 * Разбивает все лотки на отрезки с учётом стыков и пересечений.
 * Ключ отрезка "routeId:номер" (или "routeId:номер.часть", если отрезок разрезан)
 * нужен, чтобы потом считать заполнение каждого участка лотка.
 */
export function listSegments(routes) {
  // 1. Исходные отрезки; концы лотков притягиваем к соседним лоткам
  const raw = []
  for (const route of routes) {
    const pts = route.points.map((p) => ({ x: p.x, y: p.y }))
    if (pts.length < 2) continue
    pts[0] = joinEnd(pts[0], route.id, routes)
    pts[pts.length - 1] = joinEnd(pts[pts.length - 1], route.id, routes)
    for (let i = 1; i < pts.length; i++) {
      raw.push({ key: `${route.id}:${i - 1}`, routeId: route.id, a: pts[i - 1], b: pts[i], cuts: [] })
    }
  }

  // 2. Точки, где отрезки разных лотков встречаются, становятся точками разреза
  for (let i = 0; i < raw.length; i++) {
    for (let j = i + 1; j < raw.length; j++) {
      const s1 = raw[i]
      const s2 = raw[j]
      if (s1.routeId === s2.routeId) continue
      const x = intersect(s1.a, s1.b, s2.a, s2.b)
      if (x) { s1.cuts.push(x); s2.cuts.push(x) }
    }
  }

  // 3. Режем отрезки в найденных точках
  const segments = []
  for (const s of raw) {
    const len = dist(s.a, s.b)
    const inner = s.cuts
      .map((p) => ({ p, d: dist(s.a, p) }))
      .filter((c) => c.d > 1 && c.d < len - 1)        // точки у самых концов не режут
      .sort((c1, c2) => c1.d - c2.d)
      .map((c) => c.p)
    if (inner.length === 0) {
      segments.push({ key: s.key, routeId: s.routeId, a: s.a, b: s.b })
      continue
    }
    const pts = [s.a, ...inner, s.b]
    for (let k = 1; k < pts.length; k++) {
      segments.push({ key: `${s.key}.${k}`, routeId: s.routeId, a: pts[k - 1], b: pts[k] })
    }
  }
  return segments
}

// ---------- граф трасс ----------
// Вершины графа — точки изломов, стыков и пересечений лотков, рёбра — отрезки лотков.

const nodeKey = (p) => `${Math.round(p.x)};${Math.round(p.y)}`

function addNode(graph, key, point) {
  if (!graph.has(key)) graph.set(key, { point, edges: [] })
}

// segmentKey = null у отвода: это кусок кабеля вне лотка (от лотка до розетки или шкафа)
function addEdge(graph, k1, k2, length, segmentKey) {
  graph.get(k1).edges.push({ to: k2, length, segmentKey })
  graph.get(k2).edges.push({ to: k1, length, segmentKey })
}

function buildGraph(segments) {
  const graph = new Map()
  for (const s of segments) {
    const ka = nodeKey(s.a)
    const kb = nodeKey(s.b)
    addNode(graph, ka, s.a)
    addNode(graph, kb, s.b)
    addEdge(graph, ka, kb, dist(s.a, s.b), s.key)
  }
  return graph
}

/**
 * Подключает устройство (розетку или шкаф) к сети лотков.
 * Устройство соединяется отводом со ВСЕМИ лотками в пределах maxAttachPx,
 * а какой из них выгоднее, решит поиск кратчайшего пути.
 * Возвращает список мест подключения (временных вершин).
 */
function attachDevice(graph, name, p, segments, maxAttachPx) {
  addNode(graph, name, p)
  const places = []
  segments.forEach((s, i) => {
    const proj = projectOnSegment(p, s.a, s.b)
    if (proj.distance > maxAttachPx) return
    const tap = `${name}_${i}`                       // точка отвода на отрезке s
    addNode(graph, tap, proj.point)
    addEdge(graph, name, tap, proj.distance, null)  // отвод
    addEdge(graph, tap, nodeKey(s.a), dist(proj.point, s.a), s.key)
    addEdge(graph, tap, nodeKey(s.b), dist(proj.point, s.b), s.key)
    places.push({ tap, segment: s, point: proj.point })
  })
  return places
}

// Кабель вне лотка нежелателен, поэтому при выборе пути метр отвода «стоит» дороже
// метра лотка. Так розетка подключается к ближайшему лотку, а к дальнему —
// только если ближний не ведёт к шкафу. Длина кабеля при этом считается по факту.
const ATTACH_WEIGHT = 5

/** Алгоритм Дейкстры: кратчайший путь от вершины start до вершины goal. */
function shortestPath(graph, start, goal) {
  const distTo = new Map([[start, 0]])
  const cameFrom = new Map()           // вершина -> { from, edge }
  const visited = new Set()

  while (true) {
    // берём непосещённую вершину с наименьшим расстоянием
    let current = null
    for (const [key, d] of distTo) {
      if (!visited.has(key) && (current === null || d < distTo.get(current))) current = key
    }
    if (current === null) return null  // путь не найден
    if (current === goal) break
    visited.add(current)

    for (const edge of graph.get(current).edges) {
      const weight = edge.segmentKey === null ? ATTACH_WEIGHT : 1
      const candidate = distTo.get(current) + edge.length * weight
      if (!distTo.has(edge.to) || candidate < distTo.get(edge.to)) {
        distTo.set(edge.to, candidate)
        cameFrom.set(edge.to, { from: current, edge })
      }
    }
  }

  // восстанавливаем путь от конца к началу, отдельно считая длину лотков и отводов
  const points = []
  const segmentKeys = []
  let tray = 0
  let attach = 0
  let key = goal
  while (key !== start) {
    points.unshift(graph.get(key).point)
    const { from, edge } = cameFrom.get(key)
    if (edge.segmentKey === null) attach += edge.length
    else { tray += edge.length; segmentKeys.push(edge.segmentKey) }
    key = from
  }
  points.unshift(graph.get(start).point)
  return { tray, attach, points, segmentKeys: [...new Set(segmentKeys)] }
}

/**
 * Ищет путь кабеля от точки from (розетка) до точки to (шкаф) по лоткам.
 * maxAttachPx — насколько далеко от лотка может стоять розетка или шкаф.
 * Возвращает null, если путь проложить нельзя (правило R7).
 */
export function findCablePath(from, to, segments, maxAttachPx) {
  if (segments.length === 0) return null
  const graph = buildGraph(segments)
  const starts = attachDevice(graph, 'FROM', from, segments, maxAttachPx)
  const ends = attachDevice(graph, 'TO', to, segments, maxAttachPx)
  if (starts.length === 0 || ends.length === 0) return null

  // розетка и шкаф у одного и того же отрезка: идём прямо по нему
  for (const s of starts) {
    for (const e of ends) {
      if (s.segment.key === e.segment.key) addEdge(graph, s.tap, e.tap, dist(s.point, e.point), s.segment.key)
    }
  }

  const path = shortestPath(graph, 'FROM', 'TO')
  if (!path) return null
  return {
    trayPx: path.tray,                            // путь по лоткам
    attachPx: path.attach,                        // отводы от лотка к розетке и к шкафу
    segmentKeys: path.segmentKeys,                // по каким отрезкам лотков идёт кабель
    points: path.points,                          // для отрисовки (от розетки до шкафа)
  }
}

/** Округление вверх до 0,1 м. */
const ceil1 = (v) => Math.ceil(v * 10 - 1e-9) / 10

/**
 * Длина кабеля по формуле (2.1) пояснительной записки:
 * L = k · (путь по трассе + отводы) + (h_тр − h_р) + h_ш + r.
 * Длина канала = L + коммутационный шнур в шкафу + абонентский шнур.
 */
export function cableLength(path, metersPerPx, params) {
  const horizontal = (path.trayPx + path.attachPx) * metersPerPx
  const vertical = (params.hTray - params.hOutlet) + params.hCab
  const length = ceil1(horizontal + vertical + params.reserve)
  const channel = ceil1(length + params.cordCab + params.cordWp)
  return { length, channel }
}
