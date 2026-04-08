import { useState, useCallback } from 'react'
import ConfirmModal from '../components/ConfirmModal'

export function useConfirm() {
  const [options, setOptions] = useState(null)

  const confirm = useCallback((opts) => {
    return new Promise((resolve) => {
      setOptions({ ...opts, resolve })
    })
  }, [])

  const handleConfirm = () => {
    options?.resolve(true)
    setOptions(null)
  }

  const handleCancel = () => {
    options?.resolve(false)
    setOptions(null)
  }

  const BoundConfirmModal = () =>
    options ? (
      <ConfirmModal
        title={options.title}
        message={options.message}
        confirmLabel={options.confirmLabel}
        variant={options.variant ?? 'danger'}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    ) : null

  return { confirm, ConfirmModal: BoundConfirmModal }
}
