<!-- Панель инструментов: выбор режима работы с планом и групповые действия. -->
<script setup>
import { ref } from 'vue'
import { project, ui, finishTray, connectAll, clearLinks, applyCalibration } from '../core/store.js'

const tools = [
  { id: 'select', title: 'Выбор', hint: 'Щелчок — выделить элемент, перетаскивание — переместить.' },
  { id: 'outlet', title: 'Розетка', hint: 'Щелчок по плану ставит двухпортовую розетку.' },
  { id: 'ap', title: 'Точка доступа', hint: 'Щелчок по плану ставит точку беспроводного доступа.' },
  { id: 'cabinet', title: 'Шкаф', hint: 'Щелчок по плану ставит телекоммуникационный шкаф.' },
  { id: 'tray', title: 'Лоток', hint: 'Щелчки ставят точки лотка. Двойной щелчок или Enter — закончить. Точки примагничиваются к другим лоткам.' },
  { id: 'link', title: 'Кабельная линия', hint: 'Щелчок по розетке, затем по шкафу: все свободные порты розетки подключаются к шкафу.' },
  { id: 'calibrate', title: 'Масштаб', hint: 'Отметьте на плане две точки и введите расстояние между ними в метрах.' },
  { id: 'delete', title: 'Удалить', hint: 'Щелчок по элементу удаляет его вместе с подключёнными линиями.' },
]

const calibDistance = ref(10)

function selectTool(id) {
  if (ui.tool === 'tray') finishTray()
  ui.tool = id
  ui.linkStart = null
}
</script>

<template>
  <div>
    <h3>Инструменты</h3>
    <div class="tools">
      <button
        v-for="t in tools" :key="t.id"
        :class="['tool', { active: ui.tool === t.id }]"
        :data-tool="t.id"
        @click="selectTool(t.id)"
      >{{ t.title }}</button>
    </div>
    <p class="hint">{{ tools.find((t) => t.id === ui.tool).hint }}</p>

    <div v-if="ui.tool === 'tray' && ui.draftTray.length" class="box">
      Точек: {{ ui.draftTray.length }}
      <button class="btn" @click="finishTray">Закончить лоток</button>
    </div>

    <div v-if="ui.tool === 'calibrate'" class="box">
      <template v-if="ui.calibPoints.length === 2">
        Расстояние, м:
        <input v-model.number="calibDistance" type="number" min="0.1" step="0.1" class="num" />
        <button class="btn primary" @click="applyCalibration(calibDistance)">Применить</button>
      </template>
      <template v-else>Отмечено точек: {{ ui.calibPoints.length }} из 2</template>
      <div class="muted">Текущий масштаб: {{ project.plan.metersPerPx.toFixed(4) }} м/пиксель</div>
    </div>

    <h3>Кабельные линии</h3>
    <div class="row">
      <button class="btn" data-act="connect-all" @click="connectAll">Проложить все линии</button>
      <button class="btn danger" @click="clearLinks">Удалить все линии</button>
    </div>
  </div>
</template>

<style scoped>
.tools { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.tool { padding: 8px; border: 1px solid #c4cdd5; border-radius: 4px; background: #fff; cursor: pointer; text-align: left; font-size: 13px; }
.tool.active { background: #1f6feb; border-color: #1f6feb; color: #fff; }
.hint { color: #52606d; margin: 8px 0; line-height: 1.4; }
.box { padding: 8px; background: #f5f7fa; border-radius: 4px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.num { width: 70px; padding: 4px; }
.row { display: flex; gap: 6px; flex-wrap: wrap; }
</style>
