import { useEffect, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { Camera, Upload } from 'lucide-react'
import s from './RetakeDialog.module.css'

type Props = { open: boolean; onClose: () => void; onFile: (file: File) => void }

export function RetakeDialog({ open, onClose, onFile }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  // native <dialog>: focus trap, Esc to close and dimmed backdrop for free
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const { getRootProps, getInputProps, isDragActive, open: browse } = useDropzone({
    accept: { 'image/jpeg': [], 'image/png': [] },
    multiple: false,
    noClick: true,
    onDrop: (files) => {
      if (!files[0]) return
      onFile(files[0])
      onClose()
    },
  })

  return (
    <dialog ref={ref} className={s.dialog} onClose={onClose} aria-labelledby="retake-title">
      <h2 id="retake-title" className={s.title}>Retake photo</h2>
      <p className={s.lead}>Take a close-up of this single item. It goes straight to the classifier.</p>

      <div {...getRootProps({ className: `${s.drop} ${isDragActive ? s.dragging : ''}` })}>
        {/* capture: opens the back camera on phones */}
        <input {...getInputProps()} capture="environment" />
        <Camera size={32} aria-hidden="true" />
        <p className={s.dropTitle}>{isDragActive ? 'Drop it!' : 'Drop a photo here'}</p>
        <button type="button" className={s.button} onClick={browse}>
          <Upload size={16} /> Choose a photo
        </button>
      </div>

      <button type="button" className={s.cancel} onClick={onClose}>Cancel</button>
    </dialog>
  )
}
