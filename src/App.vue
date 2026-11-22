<!-- Корневой компонент: верхняя панель, холст плана, правая панель с вкладками, строка состояния. -->
<script setup>
import TopBar from './components/TopBar.vue'
import PlanCanvas from './components/PlanCanvas.vue'
import ToolPanel from './components/ToolPanel.vue'
import PropertiesPanel from './components/PropertiesPanel.vue'
import ReportPanel from './components/ReportPanel.vue'
import RulesPanel from './components/RulesPanel.vue'
import StatusBar from './components/StatusBar.vue'
import { ui } from './core/store.js'

const tabs = [
  { id: 'tools', title: 'Инструменты' },
  { id: 'report', title: 'Проверка' },
  { id: 'rules', title: 'Нормы' },
]
</script>

<template>
  <div class="app">
    <TopBar />
    <div class="workspace">
      <PlanCanvas />
      <aside class="sidebar">
        <nav class="tabs">
          <button
            v-for="t in tabs" :key="t.id"
            :class="{ active: ui.tab === t.id }"
            :data-tab="t.id"
            @click="ui.tab = t.id"
          >{{ t.title }}</button>
        </nav>
        <div class="tab-body">
          <template v-if="ui.tab === 'tools'">
            <ToolPanel />
            <PropertiesPanel />
          </template>
          <ReportPanel v-else-if="ui.tab === 'report'" />
          <RulesPanel v-else />
        </div>
      </aside>
    </div>
    <StatusBar />
  </div>
</template>

<style>
* { box-sizing: border-box; }
html, body, #app { margin: 0; height: 100%; }
body { font-family: "Segoe UI", Arial, sans-serif; font-size: 13px; color: #1f2933; background: #f3f5f7; }
.app { display: flex; flex-direction: column; height: 100%; }
.workspace { flex: 1; display: flex; min-height: 0; }
.sidebar { width: 360px; display: flex; flex-direction: column; border-left: 1px solid #d5dbe1; background: #fff; }
.tabs { display: flex; border-bottom: 1px solid #d5dbe1; }
.tabs button { flex: 1; padding: 10px 4px; border: 0; background: none; cursor: pointer; font-size: 13px; color: #52606d; border-bottom: 2px solid transparent; }
.tabs button.active { color: #1f6feb; border-bottom-color: #1f6feb; font-weight: 600; }
.tab-body { flex: 1; overflow-y: auto; padding: 12px; }
h3 { font-size: 13px; margin: 14px 0 8px; text-transform: uppercase; letter-spacing: .03em; color: #52606d; }
h3:first-child { margin-top: 0; }
button.btn { padding: 6px 10px; border: 1px solid #c4cdd5; background: #fff; border-radius: 4px; cursor: pointer; font-size: 13px; }
button.btn:hover { background: #eef4ff; }
button.btn.primary { background: #1f6feb; border-color: #1f6feb; color: #fff; }
button.btn.danger { color: #c0392b; }
table.grid { width: 100%; border-collapse: collapse; }
table.grid th, table.grid td { border-bottom: 1px solid #e4e7eb; padding: 4px 6px; text-align: left; vertical-align: top; }
table.grid td.num, table.grid th.num { text-align: right; white-space: nowrap; }
.muted { color: #7b8794; }
.badge { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 11px; font-weight: 600; }
.badge.error { background: #fde2e1; color: #b42318; }
.badge.warning { background: #fff1d6; color: #9a5b00; }
.badge.ok { background: #dcfce7; color: #166534; }
</style>
