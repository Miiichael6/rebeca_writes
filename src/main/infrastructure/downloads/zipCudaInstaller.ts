import type { CudaInstaller } from '../../application/ports/cudaInstaller'
import { installFromZip } from './cudaInstall'

/** Adaptador de `CudaInstaller` sobre `installFromZip`. */
export const zipCudaInstaller: CudaInstaller = {
  install: (request) => installFromZip(request)
}
