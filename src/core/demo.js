// Условный объект из раздела 2.9: офис 20 × 20 м, 40 рабочих мест, серверная.
// План рисуется как SVG-картинка, масштаб 0,025 м/пиксель (20 м = 800 пикселей).

const pad = (n) => String(n).padStart(2, '0')

/** Подложка: стены, помещения и столы. */
function planSvg() {
  const desks = []
  for (const y of [285, 365, 445, 525]) {
    for (const x of [100, 180, 260, 340, 460, 540, 620, 700]) {
      desks.push(`<rect x="${x - 30}" y="${y}" width="60" height="30" fill="#eef1f4" stroke="#b8c0c8"/>`)
    }
  }
  for (const ox of [0, 200, 400, 600]) {
    for (const dx of [60, 140]) desks.push(`<rect x="${ox + dx - 30}" y="680" width="60" height="30" fill="#eef1f4" stroke="#b8c0c8"/>`)
  }
  const wall = 'stroke="#4a5560" stroke-width="6" fill="none"'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
    <rect width="800" height="800" fill="#ffffff"/>
    <rect x="3" y="3" width="794" height="794" ${wall}/>
    <path d="M3 200 H240 V3" ${wall}/>
    <path d="M340 3 V120 H460 V3" ${wall}/>
    <path d="M3 640 H797 M200 640 V797 M400 640 V797 M600 640 V797" ${wall}/>
    <g fill="#ffffff"><rect x="90" y="636" width="40" height="8"/><rect x="290" y="636" width="40" height="8"/>
      <rect x="490" y="636" width="40" height="8"/><rect x="690" y="636" width="40" height="8"/>
      <rect x="380" y="116" width="40" height="8"/><rect x="236" y="120" width="8" height="40"/></g>
    ${desks.join('')}
    <g font-family="Arial" font-size="16" fill="#7a858f">
      <text x="60" y="100">Переговорная</text><text x="360" y="108">Серверная</text>
      <text x="560" y="120">Открытое пространство</text>
      <text x="55" y="785">Кабинет 1</text><text x="255" y="785">Кабинет 2</text>
      <text x="455" y="785">Кабинет 3</text><text x="655" y="785">Кабинет 4</text>
    </g></svg>`
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)))
}

export function makeDemoProject() {
  const elements = []
  let n = 1
  const outlet = (x, y) => elements.push({ id: `TO-${pad(n++)}`, kind: 'outlet', type: 'outlet2', x, y, ports: 2 })

  // 32 рабочих места в открытом пространстве: розетка в 0,5 м от лотка
  for (const y of [280, 360, 440, 520]) {
    for (const x of [100, 180, 260, 340, 460, 540, 620, 700]) outlet(x, y)
  }
  // 8 рабочих мест в кабинетах
  for (const ox of [0, 200, 400, 600]) for (const dx of [60, 140]) outlet(ox + dx, 660)
  // розетка для двух сетевых принтеров
  outlet(700, 220)
  // четыре точки доступа
  ;[[200, 300], [600, 300], [200, 460], [600, 460]].forEach(([x, y], i) =>
    elements.push({ id: `AP-${pad(i + 1)}`, kind: 'ap', x, y, ports: 1 }))

  // шкаф в серверной: патч-панели, один коммутатор на 48 портов и маршрутизатор
  elements.push({
    id: 'CAB-01', kind: 'cabinet', x: 400, y: 60,
    devices: [
      { type: 'patchpanel' }, { type: 'patchpanel' }, { type: 'patchpanel' }, { type: 'patchpanel' },
      { type: 'switch48' }, { type: 'router' },
    ],
  })

  // лотки: ввод из серверной, магистраль, четыре ряда и коридор у кабинетов
  const tray = (id, pts) => elements.push({ id, kind: 'tray', size: 'tray100', points: pts.map(([x, y]) => ({ x, y })) })
  tray('TR-01', [[400, 120], [400, 260]])
  tray('TR-02', [[400, 260], [400, 340], [400, 420], [400, 500], [400, 620]])
  tray('TR-03', [[60, 260], [400, 260], [760, 260]])
  tray('TR-04', [[60, 340], [400, 340], [760, 340]])
  tray('TR-05', [[60, 420], [400, 420], [760, 420]])
  tray('TR-06', [[60, 500], [400, 500], [760, 500]])
  tray('TR-07', [[60, 620], [400, 620], [760, 620]])

  return {
    name: 'Офис, этаж 3 (условный объект)',
    version: 1,
    plan: { imageUrl: planSvg(), widthPx: 800, heightPx: 800, metersPerPx: 0.025, floorHeightM: 3.2 },
    elements,
    links: [],
  }
}
