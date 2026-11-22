// Каталог оборудования и материалов (статическая информация):
// названия, число портов, занимаемые юниты шкафа и сечения лотков.

export const CATALOG = {
  outlet1:    { kind: 'outlet', name: 'Розетка RJ-45 кат. 6, однопортовая', ports: 1 },
  outlet2:    { kind: 'outlet', name: 'Розетка RJ-45 кат. 6, двухпортовая', ports: 2 },
  ap:         { kind: 'ap', name: 'Точка беспроводного доступа', ports: 1 },
  patchpanel: { kind: 'patchpanel', name: 'Патч-панель 19" 24 порта кат. 6', ports: 24, units: 1 },
  switch48:   { kind: 'switch', name: 'Коммутатор 48 портов 1 Гбит/с', ports: 48, units: 1 },
  switch24:   { kind: 'switch', name: 'Коммутатор 24 порта 1 Гбит/с', ports: 24, units: 1 },
  router:     { kind: 'router', name: 'Маршрутизатор', units: 1 },
  cabinet:    { kind: 'cabinet', name: 'Шкаф телекоммуникационный 19" 24U', units: 24 },
  tray100:    { kind: 'tray', name: 'Лоток 100 x 50 мм', w: 100, h: 50 },
  tray200:    { kind: 'tray', name: 'Лоток 200 x 50 мм', w: 200, h: 50 },
  tray300:    { kind: 'tray', name: 'Лоток 300 x 50 мм', w: 300, h: 50}
}

export const itemsOfKind = (kind) => Object.keys(CATALOG).filter((key) => CATALOG[key].kind === kind)

export const CABINET_DEVICES = ['patchpanel', 'switch', 'router'].flatMap(itemsOfKind)

export const TRAYS = itemsOfKind('tray')
export const OUTLETS = itemsOfKind('outlet')