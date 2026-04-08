import { useState, useCallback, useRef } from 'react'
import ConfirmModal from '../components/ConfirmModal'

export function useConfirm() {
  const [options, setOptions] = useState(null)
  const resolverRef = useRef(null)

  const confirm = useCallback((opts) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve
      setOptions(opts)
    })
  }, [])

  const handleConfirm = useCallback(() => {
    resolverRef.current?.(true)
    resolverRef.current = null
    setOptions(null)
  }, [])

  const handleCancel = useCallback(() => {
    resolverRef.current?.(false)
    resolverRef.current = null
    setOptions(null)
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
