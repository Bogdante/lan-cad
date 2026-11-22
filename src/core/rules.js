// Экспертный компонент: база продукционных правил «ЕСЛИ … ТО …» и механизм вывода.
// Числа в условиях не записаны в правилах, а берутся из параметров норм (project.params).
import { project, ui, cableLinks, trayFill, cabinetPorts } from './store.js'

/**
 * Факты для рабочей памяти: всё, что нужно правилам, в метрах и штуках.
 * Препроцессор из схемы на рис. 2.7 пояснительной записки.
 */
export function buildFacts(project, cableLinks, trayFill) {
  const cabinets = project.elements
    .filter((e) => e.kind === 'cabinet')
    .map((cab) => ({
      id: cab.id,
      linksIn: cableLinks.filter((l) => l.to === cab.id).length,
      switchPorts: cabinetPorts(cab, 'switch'),
      panelPorts: cabinetPorts(cab, 'patchpanel'),
    }))
  return { links: cableLinks, cabinets, segments: trayFill }
}

/**
 * База правил. У каждого правила:
 * code, title — код и название; condition, conclusion — текст «ЕСЛИ» и «ТО» для отчёта;
 * severity — error (ошибка) или warning (предупреждение); source — источник нормы;
 * check(facts, params) — возвращает список нарушений { elementId, message }.
 */
export const RULES = [
  {
    code: 'R1', title: 'Предельная длина стационарной линии', severity: 'error', source: 'ГОСТ Р 53246-2025',
    condition: 'длина кабеля линии > L_lin', conclusion: 'нарушение предельной длины линии',
    check: (f, p) => f.links
      .filter((l) => l.routed && l.length > p.L_lin)
      .map((l) => ({ elementId: l.from, message: `Линия ${l.id}: ${l.length} м > ${p.L_lin} м` })),
  },
  {
    code: 'R2', title: 'Предельная длина канала', severity: 'error', source: 'ГОСТ Р 53246-2025',
    condition: 'длина канала со шнурами > L_kan', conclusion: 'нарушение предельной длины канала',
    check: (f, p) => f.links
      .filter((l) => l.routed && l.channel > p.L_kan)
      .map((l) => ({ elementId: l.from, message: `Канал ${l.id}: ${l.channel} м > ${p.L_kan} м` })),
  },
  {
    code: 'R4', title: 'Нехватка портов', severity: 'error', source: 'Расчётное условие',
    condition: 'линий в шкафу > портов коммутаторов (или патч-панелей)', conclusion: 'нехватка портов',
    check: (f) => f.cabinets.flatMap((c) => {
      const out = []
      if (c.linksIn > c.switchPorts) out.push({ elementId: c.id, message: `Шкаф ${c.id}: ${c.linksIn} линий, портов коммутаторов ${c.switchPorts}` })
      if (c.linksIn > c.panelPorts) out.push({ elementId: c.id, message: `Шкаф ${c.id}: ${c.linksIn} линий, портов патч-панелей ${c.panelPorts}` })
      return out
    }),
  },
  {
    code: 'R5', title: 'Малый резерв портов', severity: 'warning', source: 'Норма проекта',
    condition: 'свободных портов коммутаторов < K_rez %', conclusion: 'малый резерв портов',
    check: (f, p) => f.cabinets
      .filter((c) => c.switchPorts > 0 && c.linksIn <= c.switchPorts)
      .filter((c) => ((c.switchPorts - c.linksIn) / c.switchPorts) * 100 < p.K_rez)
      .map((c) => {
        const free = c.switchPorts - c.linksIn
        const pct = Math.round((free / c.switchPorts) * 1000) / 10
        return { elementId: c.id, message: `Шкаф ${c.id}: свободно ${free} из ${c.switchPorts} портов (${pct} %), нужно не меньше ${p.K_rez} %` }
      }),
  },
  {
    code: 'R7', title: 'Линия не привязана к трассе', severity: 'error', source: 'Правило модели',
    condition: 'для линии нет пути по лоткам', conclusion: 'длина не может быть определена',
    check: (f) => f.links
      .filter((l) => !l.routed)
      .map((l) => ({ elementId: l.from, message: `Линия ${l.id}: нет пути по лоткам до шкафа ${l.to}` })),
  },
  {
    code: 'R8', title: 'Переполнение лотка', severity: 'warning', source: 'Норма проекта',
    condition: 'заполнение сечения лотка > K_zap %', conclusion: 'переполнение лотка',
    check: (f, p) => f.segments
      .filter((s) => s.fill > p.K_zap)
      .map((s) => ({ elementId: s.routeId, segmentKey: s.key, message: `Лоток ${s.routeId}, участок ${s.key.split(':')[1]}: ${s.cables} кабелей, заполнение ${s.fill} % > ${p.K_zap} %` })),
  },
]

/**
 * Механизм вывода: проходит по включённым правилам, условия которых
 * выполняются на фактах, и собирает заключения в отчёт.
 */
export function runInference(facts, params, disabledRules = []) {
  const items = []
  for (const rule of RULES) {
    if (disabledRules.includes(rule.code)) continue
    for (const v of rule.check(facts, params)) {
      items.push({ code: rule.code, title: rule.title, severity: rule.severity, source: rule.source, ...v })
    }
  }
  return {
    createdAt: new Date().toISOString(),
    errors: items.filter((i) => i.severity === 'error').length,
    warnings: items.filter((i) => i.severity === 'warning').length,
    items,
  }
}

/** Кнопка «Проверить»: факты из текущей модели -> вывод -> отчёт на вкладке «Проверка». */
export function runCheck() {
  const facts = buildFacts(project, cableLinks.value, trayFill.value)
  ui.report = runInference(facts, project.params, project.disabledRules)
  ui.tab = 'report'
}
