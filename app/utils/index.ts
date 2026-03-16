import type { BadgeProps } from '@nuxt/ui'

export function getStatusBadgeProps(status?: ClauseStatus): BadgeProps {
  switch (status) {
    case 'PASS':
      return {
        color: 'success',
        icon: 'i-lucide-check-circle',
        label: 'PASS'
      }
    case 'FAIL':
      return {
        color: 'error',
        icon: 'i-lucide-x-circle',
        label: 'FAIL'
      }
    case 'MISSING':
      return {
        color: 'warning',
        icon: 'i-lucide-alert-circle',
        label: 'MISSING INFO'
      }
    case 'N/A':
      return {
        color: 'neutral',
        icon: 'i-lucide-minus-circle',
        label: 'N/A'
      }
    default:
      return {
        color: 'neutral',
        icon: 'i-lucide-help-circle',
        label: 'UNKNOWN'
      }
  }
}
