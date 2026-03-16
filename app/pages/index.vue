<script lang="ts" setup>
import { UBadge } from '#components'
import type { TableColumn } from '@nuxt/ui'

const { data, status } = await useFetch<ClauseStatusRecord[]>('/api/evaluation', {
  key: 'evaluation',
  lazy: true
})

const columns: TableColumn<ClauseStatusRecord>[] = [
  {
    accessorKey: 'clause',
    header: 'Requirement #',
    meta: {
      class: {
        th: 'w-1/12',
        td: 'w-1/12'
      }
    }
  },
  {
    accessorKey: 'title',
    header: 'Title',
    meta: {
      class: {
        th: 'w-2/12',
        td: 'w-2/12'
      }
    }
  },
  {
    accessorKey: 'summary',
    header: 'Summary',
    meta: {
      class: {
        th: 'w-3/12',
        td: 'w-3/12'
      }
    }
  },
  {
    accessorKey: 'applicable_if',
    header: 'Applicable If',
    meta: {
      class: {
        th: 'w-2/12',
        td: 'w-2/12'
      }
    }
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => row.getValue('status')
      ? h(UBadge, {
          ...getStatusBadgeProps(row.getValue('status')),
          variant: 'subtle'
        })
      : '',
    meta: {
      class: {
        th: 'w-1/12 min-w-[150px]',
        td: 'w-1/12 min-w-[150px]'
      }
    }
  },
  {
    accessorKey: 'justification',
    header: 'Justification',
    meta: {
      class: {
        th: 'w-3/12',
        td: 'w-3/12'
      }
    }
  }
]
</script>

<template>
  <UDashboardPanel
    id="evaluations"
    :ui="{ body: 'sm:p-0 p-0' }"
  >
    <template #header>
      <UDashboardNavbar
        title="Evaluations"
        :ui="{ right: 'gap-3' }"
      >
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
      <UTable
        :data="data"
        :columns="columns"
        :loading="status === 'pending'"
        sticky="header"
        :ui="{
          td: 'p-2 md:p-2 whitespace-pre-line'
        }"
      />
    </template>
  </UDashboardPanel>
</template>
