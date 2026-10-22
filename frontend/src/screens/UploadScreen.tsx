import type { Dispatch } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useDropzone } from 'react-dropzone'
import { Camera, Upload } from 'lucide-react'
import { analyzeImage } from '../api/client'
import type { FlowAction } from '../state/flow'
import { Fridge } from '../components/Fridge'
import s from './UploadScreen.module.css'

export function UploadScreen({ dispatch }: { dispatch: Dispatch<FlowAction> }) {
  const analysis = useMutation({
    mutationFn: analyzeImage,
    onSuccess: (result) => dispatch({ type: 'analyzed', analysis: result }),
  })

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: { 'image/jpeg': [], 'image/png': [] },
    multiple: false,
    noClick: true,
    disabled: analysis.isPending,
    onDrop: (files) => files[0] && analysis.mutate(files[0]),
  })

  return (
    <main className={s.layout}>
      <section className={s.intro}>
        <p className={s.kicker}>Step 1 of 3</p>
        <h1 className={s.title}>What's sitting on your table?</h1>
        <p className={s.lead}>
          Upload a photo of your food. We'll identify the ingredients, let you review them,
          and suggest 3 recipes using what you have.
        </p>
      </section>

      <section className={s.fridge}>
        <Fridge>
          <div {...getRootProps({ className: `${s.drop} ${isDragActive ? s.dragging : ''}` })}>
            <input {...getInputProps()} />
            {analysis.isPending ? (
              <p className={s.dropTitle}>Identifying your ingredients…</p>
            ) : (
              <>
                <span className={s.icon}><Camera size={36} color="#fff" /></span>
                <p className={s.dropTitle}>{isDragActive ? 'Drop it here!' : 'Drag your photo here'}</p>
                <button type="button" className={s.button} onClick={open}>
                  <Upload size={18} /> Choose a photo
                </button>
                {analysis.isError && <p className={s.error}>{analysis.error.message}</p>}
              </>
            )}
          </div>
        </Fridge>
      </section>
    </main>
  )
}
