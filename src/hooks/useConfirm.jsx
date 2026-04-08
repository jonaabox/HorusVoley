import { useState, useCallback } from 'react'
import ConfirmModal from '../components/ConfirmModal'

export function useConfirm() {
  const [options, setOptions] = useState(null)

  const confirm = useCallback((opts) => {
    return new Promise((resolve) => {
      setOptions({ ...opts, resolve })
    })
  }, [])

  const handleConfirm = useCallback(() => {
    setOptions(prev => { prev?.resolve(true); return null })
  }, [])

  const handleCancel = useCallback(() => {
    setOptions(prev => { prev?.resolve(false); return null })
  }, [])

  const BoundConfirmModal = useCallback(
    () =>
      options ? (
        <ConfirmModal
          title={options.title}
          message={options.message}
          confirmLabel={options.confirmLabel}
          variant={options.variant ?? 'danger'}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      ) : null,
    [options, handleConfirm, handleCancel]
  )

  return { confirm, ConfirmModal: BoundConfirmModal }
}
