<script lang="ts" setup>
import type { ComplianceSummary } from "~~/shared/types/summary";

const { data: summary, status } = await useFetch<ComplianceSummary>(
  "/api/summary",
  {
    key: "summary",
    lazy: true,
  },
);

function getRiskBadgeProps(risk?: string) {
  switch (risk) {
    case "HIGH":
      return {
        color: "error" as const,
        icon: "i-lucide-shield-x",
        label: "HIGH RISK",
      };
    case "MEDIUM":
      return {
        color: "warning" as const,
        icon: "i-lucide-shield-alert",
        label: "MEDIUM RISK",
      };
    case "LOW":
      return {
        color: "success" as const,
        icon: "i-lucide-shield-check",
        label: "LOW RISK",
      };
    default:
      return {
        color: "neutral" as const,
        icon: "i-lucide-shield",
        label: "UNKNOWN",
      };
  }
}

const scoreColor = computed(() => {
  if (!summary.value) return "text-neutral-500";
  const score = summary.value.complianceScore;
  if (score >= 80) return "text-success-500";
  if (score >= 50) return "text-warning-500";
  return "text-error-500";
});

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
</script>

<template>
  <UDashboardPanel id="summary" :ui="{ body: 'sm:p-0 p-0' }">
    <template #header>
      <UDashboardNavbar title="Compliance Gap Summary" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UColorModeButton />
        </template>
      </UDashboardNavbar>
      <UDashboardToolbar />
    </template>

    <template #body>
      <!-- Loading -->
      <div
        v-if="status === 'pending'"
        class="flex items-center justify-center h-64"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="animate-spin size-10 text-primary"
        />
      </div>

      <div v-else-if="summary" class="p-6 space-y-8 max-w-5xl">
        <!-- ── Meta header ───────────────────────────────────────── -->
        <div class="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p class="text-xs text-muted uppercase tracking-wide mb-1">
              Standard
            </p>
            <p class="font-semibold text-lg">{{ summary.standard }}</p>
          </div>
          <div class="text-right">
            <p class="text-xs text-muted uppercase tracking-wide mb-1">
              Last evaluated
            </p>
            <p class="font-semibold">{{ formatDate(summary.evaluatedAt) }}</p>
          </div>
        </div>

        <!-- ── Executive Summary (AI-generated) ──────────────────── -->
        <UCard
          v-if="summary.executiveSummary"
          class="bg-primary/5 border-l-4 border-l-primary"
        >
          <div class="flex items-start gap-3">
            <UIcon
              name="i-lucide-sparkles"
              class="size-5 text-primary shrink-0 mt-0.5"
            />
            <div class="space-y-2">
              <p
                class="text-xs font-semibold uppercase tracking-wide text-primary"
              >
                Executive Summary
              </p>
              <p class="text-sm leading-relaxed">
                {{ summary.executiveSummary }}
              </p>
            </div>
          </div>
        </UCard>

        <!-- ── Stat cards ────────────────────────────────────────── -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Compliance Score -->
          <UCard class="col-span-2 lg:col-span-1">
            <p class="text-xs text-muted uppercase tracking-wide mb-2">
              Compliance Score
            </p>
            <p :class="['text-5xl font-bold tabular-nums', scoreColor]">
              {{ summary.complianceScore }}<span class="text-2xl">%</span>
            </p>
            <p class="text-xs text-muted mt-2">
              {{ summary.counts.pass }} of {{ summary.counts.total }} clauses
              pass
            </p>
          </UCard>

          <!-- Risk Level -->
          <UCard>
            <p class="text-xs text-muted uppercase tracking-wide mb-2">
              Risk Level
            </p>
            <UBadge
              v-bind="getRiskBadgeProps(summary.riskLevel)"
              variant="subtle"
              size="lg"
            />
          </UCard>

          <!-- Gaps -->
          <UCard>
            <p class="text-xs text-muted uppercase tracking-wide mb-2">Gaps</p>
            <p class="text-4xl font-bold tabular-nums text-error">
              {{ summary.gaps.length }}
            </p>
            <p class="text-xs text-muted mt-2">
              {{ summary.counts.fail }} FAIL ·
              {{ summary.counts.missing }} MISSING
            </p>
          </UCard>

          <!-- N/A -->
          <UCard>
            <p class="text-xs text-muted uppercase tracking-wide mb-2">
              Not Applicable
            </p>
            <p class="text-4xl font-bold tabular-nums text-dimmed">
              {{ summary.counts.na }}
            </p>
            <p class="text-xs text-muted mt-2">clauses excluded</p>
          </UCard>
        </div>

        <!-- ── Chapter breakdown ─────────────────────────────────── -->
        <div>
          <h2
            class="text-sm font-semibold uppercase tracking-wide text-muted mb-3"
          >
            Chapter Breakdown
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UCard v-for="chapter in summary.chapters" :key="chapter.chapter">
              <div class="space-y-3">
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <p class="text-xs font-mono text-muted">
                      Chapter {{ chapter.chapter }}
                    </p>
                    <p class="font-medium">{{ chapter.title }}</p>
                  </div>
                  <UBadge
                    :color="
                      chapter.counts.fail > 0
                        ? 'error'
                        : chapter.counts.missing > 0
                          ? 'warning'
                          : 'success'
                    "
                    variant="subtle"
                    :label="`${chapter.gaps.length} gap${chapter.gaps.length !== 1 ? 's' : ''}`"
                  />
                </div>
                <div class="flex flex-wrap gap-4 text-sm">
                  <span class="flex items-center gap-1.5 text-success">
                    <UIcon
                      name="i-lucide-check-circle"
                      class="size-4 shrink-0"
                    />
                    {{ chapter.counts.pass }} pass
                  </span>
                  <span
                    v-if="chapter.counts.fail > 0"
                    class="flex items-center gap-1.5 text-error"
                  >
                    <UIcon name="i-lucide-x-circle" class="size-4 shrink-0" />
                    {{ chapter.counts.fail }} fail
                  </span>
                  <span
                    v-if="chapter.counts.missing > 0"
                    class="flex items-center gap-1.5 text-warning"
                  >
                    <UIcon
                      name="i-lucide-alert-circle"
                      class="size-4 shrink-0"
                    />
                    {{ chapter.counts.missing }} missing
                  </span>
                  <span
                    v-if="chapter.counts.na > 0"
                    class="flex items-center gap-1.5 text-dimmed"
                  >
                    <UIcon
                      name="i-lucide-minus-circle"
                      class="size-4 shrink-0"
                    />
                    {{ chapter.counts.na }} n/a
                  </span>
                </div>
              </div>
            </UCard>
          </div>
        </div>

        <!-- ── Gaps requiring action ─────────────────────────────── -->
        <div>
          <div class="flex items-center gap-2 mb-3">
            <h2
              class="text-sm font-semibold uppercase tracking-wide text-muted"
            >
              Gaps Requiring Action
            </h2>
            <UBadge
              :label="String(summary.gaps.length)"
              color="error"
              variant="subtle"
            />
          </div>

          <div class="space-y-3">
            <div
              v-for="gap in summary.gaps"
              :key="gap.id"
              :class="[
                'rounded-lg border bg-default p-4 space-y-2.5',
                gap.status === 'FAIL'
                  ? 'border-l-4 border-l-error border-error/30'
                  : 'border-l-4 border-l-warning border-warning/30',
              ]"
            >
              <!-- Clause header -->
              <div class="flex items-start justify-between gap-3 flex-wrap">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-mono text-sm text-muted">{{
                    gap.clause
                  }}</span>
                  <span class="font-semibold">{{ gap.title }}</span>
                  <UBadge
                    v-if="gap.applicable_if"
                    color="neutral"
                    variant="outline"
                    size="xs"
                    :label="`IF: ${gap.applicable_if}`"
                    class="max-w-xs truncate"
                  />
                </div>
                <UBadge
                  v-bind="getStatusBadgeProps(gap.status)"
                  variant="subtle"
                  class="shrink-0"
                />
              </div>

              <!-- What was required -->
              <p v-if="gap.summary" class="text-sm text-default">
                {{ gap.summary }}
              </p>

              <!-- Why it failed / evidence is missing -->
              <div
                v-if="gap.justification"
                class="rounded-md bg-elevated px-3 py-2 text-sm text-muted"
              >
                <span class="font-semibold text-default">Justification: </span>
                {{ gap.justification }}
              </div>
            </div>
          </div>
        </div>

        <!-- ── Not assessed (N/A) ──────────────────────────────────
        <div v-if="summary.notApplicable.length > 0">
          <div class="flex items-center gap-2 mb-3">
            <h2
              class="text-sm font-semibold uppercase tracking-wide text-muted"
            >
              Not Applicable
            </h2>
            <UBadge
              :label="String(summary.notApplicable.length)"
              color="neutral"
              variant="subtle"
            />
          </div>
          <p class="text-xs text-muted mb-3">
            These clauses were excluded from the compliance score. Each entry
            explains why it was deemed not applicable.
          </p>

          <div class="space-y-3">
            <div
              v-for="item in summary.notApplicable"
              :key="item.id"
              class="rounded-lg border border-default bg-default p-4 space-y-2.5 opacity-75"
            >
              <div class="flex items-start justify-between gap-3 flex-wrap">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-mono text-sm text-muted">{{
                    item.clause
                  }}</span>
                  <span class="font-semibold">{{ item.title }}</span>
                  <UBadge
                    v-if="item.applicable_if"
                    color="neutral"
                    variant="outline"
                    size="xs"
                    :label="`IF: ${item.applicable_if}`"
                    class="max-w-xs truncate"
                  />
                </div>
                <UBadge
                  v-bind="getStatusBadgeProps('N/A')"
                  variant="subtle"
                  class="shrink-0"
                />
              </div>

              <p v-if="item.summary" class="text-sm text-default">
                {{ item.summary }}
              </p>

              <div
                v-if="item.justification"
                class="rounded-md bg-elevated px-3 py-2 text-sm text-muted"
              >
                <span class="font-semibold text-default">Why excluded: </span>
                {{ item.justification }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
