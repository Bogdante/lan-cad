<!-- Отчёт о проверке: нарушения с уровнем, источником нормы и переходом к элементу. -->
<script setup>
import { ui } from '../core/store.js'
import { runCheck } from '../core/rules.js'

const SEVERITY = { error: 'Ошибка', warning: 'Предупреждение' }

/** Щелчок по нарушению выделяет элемент на плане. */
function show(item) {
  ui.selectedId = item.elementId
}
</script>

<template>
  <div>
    <button class="btn primary" @click="runCheck">Проверить проект</button>

    <p v-if="!ui.report" class="muted">Проверка ещё не выполнялась.</p>

    <template v-else>
      <h3>Результат</h3>
      <p>
        <span :class="['badge', ui.report.errors ? 'error' : 'ok']">Ошибок: {{ ui.report.errors }}</span>
        &nbsp;
        <span :class="['badge', ui.report.warnings ? 'warning' : 'ok']">Предупреждений: {{ ui.report.warnings }}</span>
      </p>
      <p v-if="!ui.report.items.length" class="muted">Нарушений не найдено. Версию можно утверждать.</p>
      <p v-else-if="ui.report.errors" class="muted">Есть ошибки: версию утвердить нельзя.</p>
      <p v-else class="muted">Ошибок нет; предупреждения требуют обоснования.</p>

      <div v-for="(item, i) in ui.report.items" :key="i" class="item" @click="show(item)">
        <div>
          <span :class="['badge', item.severity]">{{ item.code }} · {{ SEVERITY[item.severity] }}</span>
          <b> {{ item.title }}</b>
        </div>
        <div>{{ item.message }}</div>
        <div class="muted">Источник: {{ item.source }}</div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.item { padding: 8px; margin-top: 8px; border: 1px solid #e4e7eb; border-radius: 4px; cursor: pointer; line-height: 1.5; }
.item:hover { background: #f5f8ff; }
</style>
