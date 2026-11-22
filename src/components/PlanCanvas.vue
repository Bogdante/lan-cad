<!--
  Холст плана (SVG). Рисует подложку, лотки, кабельные линии и оборудование
  и обрабатывает щелчки мыши в зависимости от выбранного инструмента.
  Координаты на холсте — пиксели плана, поэтому модель не зависит от масштаба отображения.
-->
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  project, ui, cableLinks, trayFill, elementsOfKind, findElement,
  addPointElement, moveElement, removeElement, addDraftTrayPoint, finishTray, connectOutlet,
} from '../core/store.js'

const svg = ref(null)
const dragId = ref(null)   // элемент, который сейчас перетаскивают

const plan = computed(() => project.plan)
const points = computed(() => project.elements.filter((e) => e.kind !== 'tray'))

/** Элементы и участки лотков с нарушениями из последнего отчёта — подсвечиваются красным. */
const badIds = computed(() => new Set((ui.report?.items || []).map((i) => i.elementId)))

/** Перевод координат мыши в пиксели плана. */
function toPlan(event) {
  const pt = svg.value.createSVGPoint()
  pt.x = event.clientX
  pt.y = event.clientY
  const p = pt.matrixTransform(svg.value.getScreenCTM().inverse())
  return { x: p.x, y: p.y }
}

/** Щелчок по пустому месту холста. */
function onCanvasClick(event) {
  const p = toPlan(event)
  switch (ui.tool) {
    case 'outlet':
    case 'ap':
    case 'cabinet':
      addPointElement(ui.tool, p.x, p.y)
      break
    case 'tray':
      addDraftTrayPoint(p.x, p.y)
      break
    case 'calibrate':
      if (ui.calibPoints.length >= 2) ui.calibPoints = []
      ui.calibPoints.push(p)
      break
    default:
      ui.selectedId = null
      ui.linkStart = null
  }
}

/** Щелчок по элементу (розетке, шкафу, лотку). */
function onElementDown(el, event) {
  event.stopPropagation()
  if (ui.tool === 'delete') {
    removeElement(el.id)
    return
  }
  if (ui.tool === 'link') {
    // первый щелчок — розетка или точка доступа, второй — шкаф
    if ((el.kind === 'outlet' || el.kind === 'ap')) ui.linkStart = el.id
    else if (el.kind === 'cabinet' && ui.linkStart) {
      connectOutlet(ui.linkStart, el.id)
      ui.linkStart = null
    }
    return
  }
  if (ui.tool === 'tray' || ui.tool === 'calibrate') {
    onCanvasClick(event)     // при рисовании щелчок по элементу ставит точку
    return
  }
  ui.selectedId = el.id
  if (el.kind !== 'tray') dragId.value = el.id
}

function onMove(event) {
  if (dragId.value) {
    const p = toPlan(event)
    moveElement(dragId.value, p.x, p.y)
  }
}

function onUp() {
  dragId.value = null
}

/** Клавиши: Enter — закончить лоток, Esc — отменить, Delete — удалить выделенное. */
function onKey(event) {
  if (event.target.tagName === 'INPUT') return
  if (event.key === 'Enter') finishTray()
  if (event.key === 'Escape') { ui.draftTray = []; ui.linkStart = null; ui.calibPoints = [] }
  if (event.key === 'Delete' && ui.selectedId) removeElement(ui.selectedId)
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))

// ---------- вспомогательные функции для отрисовки ----------

const pts = (list) => list.map((p) => `${p.x},${p.y}`).join(' ')

/** Цвет участка лотка: серый — норма, оранжевый — заполнение выше допустимого. */
function segmentColor(s) {
  return s.fill > project.params.K_zap ? '#f08c00' : '#8a96a3'
}

const routedLinks = computed(() => cableLinks.value.filter((l) => l.routed))
const brokenLinks = computed(() => cableLinks.value.filter((l) => !l.routed))
</script>

<template>
  <div class="canvas-wrap">
    <svg
      ref="svg"
      :width="plan.widthPx * ui.zoom"
      :height="plan.heightPx * ui.zoom"
      :viewBox="`0 0 ${plan.widthPx} ${plan.heightPx}`"
      :class="['plan', 'tool-' + ui.tool]"
      @click="onCanvasClick"
      @dblclick="finishTray"
      @pointermove="onMove"
      @pointerup="onUp"
    >
      <!-- подложка -->
      <image v-if="plan.imageUrl" :href="plan.imageUrl" x="0" y="0" :width="plan.widthPx" :height="plan.heightPx" />
      <rect v-else :width="plan.widthPx" :height="plan.heightPx" fill="#fff" />

      <!-- лотки: каждый участок своим цветом по заполнению -->
      <g v-for="s in trayFill" :key="s.key">
        <line :x1="s.a.x" :y1="s.a.y" :x2="s.b.x" :y2="s.b.y" :stroke="segmentColor(s)" stroke-width="7" stroke-linecap="round" opacity="0.55" />
      </g>
      <polyline
        v-for="t in elementsOfKind('tray')" :key="t.id"
        :points="pts(t.points)" fill="none" stroke="transparent" stroke-width="16"
        class="hit" @pointerdown="onElementDown(t, $event)" @click.stop
      />
      <polyline
        v-if="ui.selectedId && findElement(ui.selectedId)?.kind === 'tray'"
        :points="pts(findElement(ui.selectedId).points)" fill="none" stroke="#1f6feb" stroke-width="2" stroke-dasharray="6 4"
      />

      <!-- кабельные линии -->
      <polyline v-for="l in routedLinks" :key="l.id" :points="pts(l.points)" fill="none" stroke="#1f6feb" stroke-width="1.2" opacity="0.35" />
      <line
        v-for="l in brokenLinks" :key="l.id"
        :x1="l.points[0].x" :y1="l.points[0].y" :x2="l.points[1].x" :y2="l.points[1].y"
        stroke="#d92d20" stroke-width="1.5" stroke-dasharray="5 4"
      />

      <!-- рисуемый лоток -->
      <polyline v-if="ui.draftTray.length" :points="pts(ui.draftTray)" fill="none" stroke="#1f6feb" stroke-width="5" stroke-dasharray="8 5" />
      <circle v-for="(p, i) in ui.draftTray" :key="'d' + i" :cx="p.x" :cy="p.y" r="5" fill="#1f6feb" />

      <!-- калибровка -->
      <line v-if="ui.calibPoints.length === 2" :x1="ui.calibPoints[0].x" :y1="ui.calibPoints[0].y" :x2="ui.calibPoints[1].x" :y2="ui.calibPoints[1].y" stroke="#7c3aed" stroke-width="2" />
      <circle v-for="(p, i) in ui.calibPoints" :key="'c' + i" :cx="p.x" :cy="p.y" r="6" fill="#7c3aed" />

      <!-- точечные элементы -->
      <g
        v-for="el in points" :key="el.id"
        :transform="`translate(${el.x},${el.y})`"
        class="hit" @pointerdown="onElementDown(el, $event)" @click.stop
      >
        <circle v-if="badIds.has(el.id)" r="17" fill="none" stroke="#d92d20" stroke-width="3" />
        <circle v-if="ui.selectedId === el.id || ui.linkStart === el.id" r="20" fill="none" stroke="#1f6feb" stroke-width="2" stroke-dasharray="4 3" />

        <template v-if="el.kind === 'outlet'">
          <rect x="-8" y="-8" width="16" height="16" rx="2" fill="#fff" stroke="#1f6feb" stroke-width="2" />
          <text y="4" text-anchor="middle" class="sym">{{ el.ports }}</text>
        </template>
        <template v-else-if="el.kind === 'ap'">
          <circle r="10" fill="#fff" stroke="#7c3aed" stroke-width="2" />
          <text y="4" text-anchor="middle" class="sym ap">AP</text>
        </template>
        <template v-else-if="el.kind === 'cabinet'">
          <rect x="-22" y="-14" width="44" height="28" rx="3" fill="#1f2933" />
          <text y="5" text-anchor="middle" class="sym light">ШКАФ</text>
        </template>
        <!-- подпись справа от значка, чтобы не закрывать лотки -->
        <text v-if="el.kind === 'cabinet'" y="-20" text-anchor="middle" class="label">{{ el.id }}</text>
        <text v-else x="12" y="3" class="label">{{ el.id }}</text>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.canvas-wrap { flex: 1; overflow: auto; padding: 16px; background: #e9edf1; }
.plan { display: block; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.15); }
.plan.tool-select .hit { cursor: move; }
.plan.tool-outlet, .plan.tool-ap, .plan.tool-cabinet, .plan.tool-tray, .plan.tool-calibrate { cursor: crosshair; }
.plan.tool-delete .hit { cursor: not-allowed; }
.plan.tool-link .hit { cursor: pointer; }
.sym { font-size: 9px; font-weight: 700; fill: #1f6feb; pointer-events: none; }
.sym.ap { fill: #7c3aed; }
.sym.light { fill: #fff; }
.label { font-size: 9px; fill: #52606d; pointer-events: none; }
</style>
