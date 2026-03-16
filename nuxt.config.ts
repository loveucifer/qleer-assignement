// https://nuxt.com/docs/api/configuration/nuxt-config
const env =
  (
    globalThis as unknown as {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process?.env ?? {};

export default defineNuxtConfig({
  modules: ["@nuxt/eslint", "@nuxt/ui", "@nuxt/image"],

  runtimeConfig: {
    // Server-only — never exposed to the browser
    // Support both plain and Nuxt-prefixed env names.
    geminiApiKey: env.GEMINI_API_KEY ?? env.NUXT_GEMINI_API_KEY ?? "",
  },

  devtools: {
    enabled: true,
  },

  css: ["~/assets/css/main.css"],

  compatibilityDate: "2025-01-15",

  eslint: {
    config: {
      stylistic: {
        commaDangle: "never",
        braceStyle: "1tbs",
      },
    },
  },
});
