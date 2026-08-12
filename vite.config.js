import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const claudeKey = env.VITE_CLAUDE_API_KEY || ""

  return {
    base: mode === 'production' ? '/agent-library/' : '/',
    plugins: [react()],
    server: {
      proxy: {
        '/api/claude': {
          target: 'https://api.anthropic.com',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api\/claude/, '/v1/messages'),
          headers: claudeKey ? {
            'x-api-key': claudeKey,
            'anthropic-version': '2023-06-01'
          } : {
            'anthropic-version': '2023-06-01'
          }
        }
      }
    }
  }
})
