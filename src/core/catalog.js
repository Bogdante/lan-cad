// Каталог оборудования и материалов (статическая информация):
// названия, число портов, занимаемые юниты шкафа и сечения лотков.

export const CATALOG = {
  outlet1:    { group: 'outlet', name: 'Розетка RJ-45 кат. 6, однопортовая', ports: 1 },
  outlet2:    { group: 'outlet', name: 'Розетка RJ-45 кат. 6, двухпортовая', ports: 2 },
  ap:         { group: 'ap', name: 'Точка беспроводного доступа', ports: 1 },
  patchpanel: { group: 'patchpanel', name: 'Патч-панель 19" 24 порта кат. 6', ports: 24, units: 1 },
  switch48:   { group: 'switch', name: 'Коммутатор 48 портов 1 Гбит/с', ports: 48, units: 1 },
  switch24:   { group: 'switch', name: 'Коммутатор 24 порта 1 Гбит/с', ports: 24, units: 1 },
  router:     { group: 'router', name: 'Маршрутизатор', units: 1 },
  cabinet:    { group: 'cabinet', name: 'Шкаф телекоммуникационный 19" 24U', units: 24 },
  tray100:    { group: 'tray', name: 'Лоток 100 x 50 мм', w: 100, h: 50 },
  tray200:    { group: 'tray', name: 'Лоток 200 x 50 мм', w: 200, h: 50 },
  tray300:    { group: 'tray', name: 'Лоток 300 x 50 мм', w: 300, h: 50}
}

export const itemsOfGroup = (group) => Object.keys(CATALOG).filter((key) => CATALOG[key].group === group)

export const CABINET_DEVICES = ['patchpanel', 'switch', 'router'].flatMap(itemsOfGroup)

export const TRAYS = itemsOfGroup('tray')
export const OUTLETS = itemsOfGroup('outlet')