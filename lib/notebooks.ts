// lib/notebooks.ts
import { Notebook } from '@/types/notebook'

const notebooks: Notebook[] = [
  {
    slug: 'cms-medicare-data-cleaning',
    title: 'CMS Medicare Part D Data Cleaning',
    description: 'Comprehensive data cleaning and preprocessing of Medicare prescription drug data from CMS.',
    githubUrl: 'https://github.com/dillon-shearer/portfolio/blob/main/ChronicConditions_PrescriptionDrugs_Project/1_Data_Cleaning/1_1_cms_medicare_pt_d_data_cleaning.ipynb',
    rawUrl: 'https://raw.githubusercontent.com/dillon-shearer/portfolio/refs/heads/main/ChronicConditions_PrescriptionDrugs_Project/1_Data_Cleaning/1_1_cms_medicare_pt_d_data_cleaning.ipynb',
    category: 'Data Cleaning'
  }
]

export function getAllNotebooks(): Notebook[] {
  return notebooks.sort((a, b) => a.title.localeCompare(b.title))
}

export function getNotebookBySlug(slug: string): Notebook | undefined {
  return notebooks.find(notebook => notebook.slug === slug)
}

export function getNotebooksByCategory(category: string): Notebook[] {
  return notebooks.filter(notebook => notebook.category === category)
}