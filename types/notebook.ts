// types/notebook.ts
export interface Notebook {
  slug: string
  title: string
  description: string
  githubUrl: string
  rawUrl: string
  category?: string
}

export interface NotebookCell {
  cell_type: 'markdown' | 'code'
  source: string | string[]
  outputs?: NotebookOutput[]
  execution_count?: number
}

export interface NotebookOutput {
  output_type: 'stream' | 'display_data' | 'execute_result' | 'error'
  name?: string
  text?: string | string[]
  data?: {
    'text/plain'?: string | string[]
    'text/html'?: string | string[]
    'image/png'?: string
    'image/jpeg'?: string
    'application/json'?: any
  }
  traceback?: string[]
}

export interface NotebookData {
  cells: NotebookCell[]
  metadata: {
    kernelspec?: {
      display_name: string
      language: string
      name: string
    }
  }
}