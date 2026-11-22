<!-- Строка состояния: масштаб и сводка по проекту. -->
<script setup>
import { project, summary } from '../core/store.js'
</script>

<template>
  <footer class="status">
    <span>Масштаб: {{ project.plan.metersPerPx.toFixed(4) }} м/пикс.</span>
    <span>Абонентских точек: {{ summary.outlets }}</span>
    <span>Линий: {{ summary.links }}</span>
    <span>Общая длина всех кабелей: {{ summary.totalM }} м</span>
    <span>Самая длинная линия: {{ summary.maxM }} м</span>
    <span>Длина лотков: {{ summary.trayM }} м</span>
  </footer>
</template>

<style scoped>
.status { display: flex; gap: 24px; padding: 6px 12px; background: #fff; border-top: 1px solid #d5dbe1; color: #52606d; }
</style>
