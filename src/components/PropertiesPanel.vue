<!-- Свойства выделенного элемента: розетки, шкафа или лотка. -->
<script setup>
import { computed } from 'vue'
import {
  project, ui, findElement, removeElement, addDevice, removeDevice, cabinetPorts, cableLinks, trayFill,
} from '../core/store.js'
import { CATALOG, CABINET_DEVICES, TRAY_SIZES } from '../core/catalog.js'
import { polylineLength } from '../core/geometry.js'

const el = computed(() => (ui.selectedId ? findElement(ui.selectedId) : null))

/** Линии, которые начинаются у выделенной розетки или приходят в выделенный шкаф. */
const links = computed(() => cableLinks.value.filter((l) => l.from === ui.selectedId || l.to === ui.selectedId))

const trayInfo = computed(() => {
  if (el.value?.kind !== 'tray') return null
  const parts = trayFill.value.filter((s) => s.routeId === el.value.id)
  return {
    lengthM: (polylineLength(el.value.points) * project.plan.metersPerPx).toFixed(1),
    maxFill: Math.max(0, ...parts.map((s) => s.fill)),
    maxCables: Math.max(0, ...parts.map((s) => s.cables)),
  }
})

const KIND_NAMES = { outlet: 'Розетка', ap: 'Точка доступа', cabinet: 'Шкаф', tray: 'Лоток' }
</script>

<template>
  <div v-if="el" class="props">
    <h3>{{ KIND_NAMES[el.kind] }} {{ el.id }}</h3>

    <!-- розетка или точка доступа -->
    <template v-if="el.kind === 'outlet' || el.kind === 'ap'">
      <p>Портов: {{ el.ports }}. Подключено линий: {{ links.length }}.</p>
      <table v-if="links.length" class="grid">
        <tr><th>Линия</th><th>Шкаф</th><th class="num">Длина, м</th><th class="num">Канал, м</th></tr>
        <tr v-for="l in links" :key="l.id">
          <td>{{ l.id }}</td><td>{{ l.to }}</td>
          <td class="num">{{ l.routed ? l.length : '—' }}</td>
          <td class="num">{{ l.routed ? l.channel : '—' }}</td>
        </tr>
      </table>
    </template>

    <!-- шкаф: состав оборудования и баланс портов -->
    <template v-if="el.kind === 'cabinet'">
      <p>
        Линий в шкаф: <b>{{ links.length }}</b>.
        Портов коммутаторов: <b>{{ cabinetPorts(el, 'switch') }}</b>,
        патч-панелей: <b>{{ cabinetPorts(el, 'patchpanel') }}</b>.
      </p>
      <table class="grid">
        <tr v-for="(d, i) in el.devices" :key="i">
          <td>{{ CATALOG[d.type].name }}</td>
          <td class="num"><button class="btn danger" @click="removeDevice(el.id, i)">×</button></td>
        </tr>
      </table>
      <p class="muted">Добавить в шкаф:</p>
      <div class="add">
        <button v-for="key in CABINET_DEVICES" :key="key" class="btn" :data-add="key" @click="addDevice(el.id, key)">
          {{ CATALOG[key].name }}
        </button>
      </div>
    </template>

    <!-- лоток -->
    <template v-if="el.kind === 'tray'">
      <p>
        Типоразмер:
        <select v-model="el.size" data-prop="size">
          <option v-for="key in TRAY_SIZES" :key="key" :value="key">{{ CATALOG[key].name }}</option>
        </select>
      </p>
      <p>
        Длина {{ trayInfo.lengthM }} м. Наибольшая загрузка участка: {{ trayInfo.maxCables }} кабелей,
        заполнение <b :style="{ color: trayInfo.maxFill > project.params.K_zap ? '#c05600' : 'inherit' }">{{ trayInfo.maxFill }} %</b>.
      </p>
    </template>

    <button class="btn danger" @click="removeElement(el.id)">Удалить элемент</button>
  </div>
</template>

<style scoped>
.props { margin-top: 16px; padding-top: 8px; border-top: 1px solid #e4e7eb; }
.add { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; }
.add .btn { text-align: left; }
p { line-height: 1.5; }
</style>
