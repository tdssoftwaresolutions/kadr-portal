import { isNativeApp } from './platform'

/**
 * Pick an image from the device gallery or camera (native) or fall back to file input.
 */
export async function pickImage ({ source = 'prompt' } = {}) {
  if (!isNativeApp()) {
    return pickImageFromFileInput({ accept: 'image/*' })
  }

  const { Camera, CameraSource, CameraResultType } = await import(
    /* webpackChunkName: "capacitor-camera" */ '@capacitor/camera'
  )

  const sourceMap = {
    camera: CameraSource.Camera,
    gallery: CameraSource.Photos,
    prompt: CameraSource.Prompt
  }

  const photo = await Camera.getPhoto({
    quality: 85,
    allowEditing: false,
    resultType: CameraResultType.DataUrl,
    source: sourceMap[source] || CameraSource.Prompt
  })

  return {
    dataUrl: photo.dataUrl,
    format: photo.format
  }
}

export function pickImageFromFileInput ({ accept = 'image/*' } = {}) {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = () => {
      const file = input.files && input.files[0]
      if (!file) {
        reject(new Error('No file selected'))
        return
      }
      const reader = new FileReader()
      reader.onload = () => resolve({ dataUrl: reader.result, file })
      reader.onerror = reject
      reader.readAsDataURL(file)
    }
    input.click()
  })
}
