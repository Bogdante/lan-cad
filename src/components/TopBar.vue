<!-- Верхняя панель: файл проекта, подложка, проверка и масштаб отображения. -->
<script setup>
import { ref } from 'vue'
import { project, ui, cableLinks, loadProject } from '../core/store.js'
import { runCheck } from '../core/rules.js'
import { makeDemoProject } from '../core/demo.js'
import { projectToJson, jsonToProject, downloadText } from '../core/io.js'

const planInput = ref(null)   // скрытое поле выбора картинки плана
const jsonInput = ref(null)   // скрытое поле выбора JSON-файла

/** Подложка: картинка из файла становится фоном плана. */
function onPlanFile(event) {
  const file = event.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    const img = new Image()
    img.onload = () => {
      project.plan.imageUrl = reader.result
      project.plan.widthPx = img.width
      project.plan.heightPx = img.height
      ui.tool = 'calibrate'      // после загрузки плана сразу задаём масштаб
    }
    img.src = reader.result
  }
  reader.readAsDataURL(file)
  event.target.value = ''
}

function onJsonFile(event) {
  const file = event.target.files[0]
  if (!file) return
  file.text().then((text) => loadProject(jsonToProject(text)))
  event.target.value = ''
}

function saveJson() {
  const text = projectToJson(project, cableLinks.value, ui.report)
  downloadText(text, `lan-project-v${project.version}.json`)
}

const zoom = (factor) => { ui.zoom = Math.min(3, Math.max(0.4, ui.zoom * factor)) }
</script>

<template>
  <header class="topbar">
    <strong class="logo">САПР ЛВС</strong>
    <input class="name" v-model="project.name" title="Название проекта" />
    <span class="muted">версия {{ project.version }}</span>

    <div class="spacer"></div>

    <button class="btn" data-act="demo" @click="loadProject(makeDemoProject())">Пример: офис</button>
    <button class="btn" @click="planInput.click()">Загрузить план</button>
    <button class="btn" @click="jsonInput.click()">Открыть JSON</button>
    <button class="btn" data-act="save" @click="saveJson">Сохранить JSON</button>
    <button class="btn primary" data-act="check" @click="runCheck">Проверить</button>

    <span class="zoom">
      <button class="btn" @click="zoom(1 / 1.2)">−</button>
      {{ Math.round(ui.zoom * 100) }} %
      <button class="btn" @click="zoom(1.2)">+</button>
    </span>

    <input ref="planInput" type="file" accept="image/*" hidden @change="onPlanFile" />
    <input ref="jsonInput" type="file" accept=".json,application/json" hidden @change="onJsonFile" />
  </header>
</template>

<style scoped>
.topbar { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #fff; border-bottom: 1px solid #d5dbe1; }
.logo { color: #1f6feb; font-size: 15px; margin-right: 6px; }
.name { width: 260px; padding: 5px 8px; border: 1px solid #d5dbe1; border-radius: 4px; font-size: 13px; }
.spacer { flex: 1; }
.zoom { display: flex; align-items: center; gap: 4px; margin-left: 8px; }
</style>
