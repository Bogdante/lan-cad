<!-- Нормы и база правил: здесь работает администратор НСИ (требование F9). -->
<script setup>
import { project } from '../core/store.js'
import { RULES } from '../core/rules.js'

const PARAMS = [
  { key: 'L_lin', title: 'Предельная длина линии, м (R1)' },
  { key: 'L_kan', title: 'Предельная длина канала, м (R2)' },
  { key: 'K_rez', title: 'Резерв портов не меньше, % (R5)' },
  { key: 'K_zap', title: 'Заполнение лотка не больше, % (R8)' },
  { key: 'hTray', title: 'Высота трассы, м' },
  { key: 'hOutlet', title: 'Высота розетки, м' },
  { key: 'hCab', title: 'Кабель внутри шкафа, м' },
  { key: 'reserve', title: 'Технологический запас, м' },
  { key: 'cordCab', title: 'Шнур в шкафу, м' },
  { key: 'cordWp', title: 'Шнур на рабочем месте, м' },
  { key: 'cableD', title: 'Диаметр кабеля, мм' },
  { key: 'maxAttachM', title: 'Отвод от лотка не больше, м' },
]

/** Включить или отключить правило. */
function toggle(code) {
  const list = project.disabledRules
  const i = list.indexOf(code)
  if (i >= 0) list.splice(i, 1)
  else list.push(code)
}
</script>

<template>
  <div>
    <h3>Параметры норм</h3>
    <table class="grid">
      <tr v-for="p in PARAMS" :key="p.key">
        <td>{{ p.title }}</td>
        <td class="num"><input v-model.number="project.params[p.key]" type="number" step="0.1" class="num-input" /></td>
      </tr>
    </table>

    <h3>База правил</h3>
    <div v-for="r in RULES" :key="r.code" class="rule">
      <label>
        <input type="checkbox" :checked="!project.disabledRules.includes(r.code)" @change="toggle(r.code)" />
        <b>{{ r.code }}</b> {{ r.title }}
        <span :class="['badge', r.severity]">{{ r.severity === 'error' ? 'ошибка' : 'предупреждение' }}</span>
      </label>
      <div class="muted">ЕСЛИ {{ r.condition }} ТО {{ r.conclusion }}. Источник: {{ r.source }}</div>
    </div>
  </div>
</template>

<style scoped>
.num-input { width: 70px; padding: 3px; text-align: right; }
.rule { padding: 6px 0; border-bottom: 1px solid #eef0f2; line-height: 1.5; }
</style>
