// Сборка в один файл dist/index.html: его можно открыть в браузере без сервера и без интернета.
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  plugins: [vue(), viteSingleFile()],
})
