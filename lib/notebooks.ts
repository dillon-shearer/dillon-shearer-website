// lib/notebooks.ts
import { Notebook } from '@/types/notebook'

const notebooks: Notebook[] = [
  // Chronic Conditions & Prescription Drugs Project
  {
    slug: 'cms-medicare-data-cleaning',
    title: 'CMS Medicare Part D Data Cleaning',
    description: 'Comprehensive data cleaning and preprocessing of Medicare prescription drug data from CMS.',
    githubUrl: 'https://github.com/dillon-shearer/portfolio/blob/main/ChronicConditions_PrescriptionDrugs_Project/1_Data_Cleaning/1_1_cms_medicare_pt_d_data_cleaning.ipynb',
    rawUrl: 'https://raw.githubusercontent.com/dillon-shearer/portfolio/refs/heads/main/ChronicConditions_PrescriptionDrugs_Project/1_Data_Cleaning/1_1_cms_medicare_pt_d_data_cleaning.ipynb',
    category: 'Data Cleaning'
  },
  {
    slug: 'cdc-places-health-cleaning',
    title: 'CDC PLACES Health Data Cleaning',
    description: 'Data cleaning and preprocessing of CDC PLACES health outcomes data for chronic conditions analysis.',
    githubUrl: 'https://github.com/dillon-shearer/portfolio/blob/main/ChronicConditions_PrescriptionDrugs_Project/1_Data_Cleaning/1_2_cdc_places_better_health_cleaning.ipynb',
    rawUrl: 'https://raw.githubusercontent.com/dillon-shearer/portfolio/refs/heads/main/ChronicConditions_PrescriptionDrugs_Project/1_Data_Cleaning/1_2_cdc_places_better_health_cleaning.ipynb',
    category: 'Data Cleaning'
  },
  {
    slug: 'chronic-conditions-analysis',
    title: 'Chronic Conditions & Prescription Drugs Analysis',
    description: 'Statistical analysis exploring relationships between chronic health conditions and prescription drug usage patterns using Medicare and CDC data.',
    githubUrl: 'https://github.com/dillon-shearer/portfolio/blob/main/ChronicConditions_PrescriptionDrugs_Project/3_Data_Analysis/3_1_data_analysis.ipynb',
    rawUrl: 'https://raw.githubusercontent.com/dillon-shearer/portfolio/refs/heads/main/ChronicConditions_PrescriptionDrugs_Project/3_Data_Analysis/3_1_data_analysis.ipynb',
    category: 'Data Analysis'
  },
  
  // Census Poverty Project
  {
    slug: 'census-data-acquisition',
    title: 'Census Poverty Data Acquisition',
    description: 'Data acquisition and collection from U.S. Census Bureau APIs for poverty analysis, including demographic and economic indicators.',
    githubUrl: 'https://github.com/dillon-shearer/portfolio/blob/main/census_Poverty/scripts/1_data_Acquisition.ipynb',
    rawUrl: 'https://raw.githubusercontent.com/dillon-shearer/portfolio/refs/heads/main/census_Poverty/scripts/1_data_Acquisition.ipynb',
    category: 'Data Acquisition'
  },
  {
    slug: 'census-poverty-preprocessing',
    title: 'Census Poverty Data Pre-Processing',
    description: 'Data preprocessing and transformation of census poverty data, including feature engineering and data quality assessment.',
    githubUrl: 'https://github.com/dillon-shearer/portfolio/blob/main/census_Poverty/scripts/2_data_Pre_Processing.ipynb',
    rawUrl: 'https://raw.githubusercontent.com/dillon-shearer/portfolio/refs/heads/main/census_Poverty/scripts/2_data_Pre_Processing.ipynb',
    category: 'Data Cleaning'
  },
  {
    slug: 'census-poverty-visualization',
    title: 'Census Poverty Data Visualization & Exploration',
    description: 'Exploratory data analysis and visualization of U.S. census poverty data, revealing geographic and demographic patterns.',
    githubUrl: 'https://github.com/dillon-shearer/portfolio/blob/main/census_Poverty/scripts/3_data_Visualization_and_Exploration.ipynb',
    rawUrl: 'https://raw.githubusercontent.com/dillon-shearer/portfolio/refs/heads/main/census_Poverty/scripts/3_data_Visualization_and_Exploration.ipynb',
    category: 'Data Visualization'
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

export function getNotebooksByProject(): { [key: string]: Notebook[] } {
  const chronicConditions = notebooks.filter(notebook => 
    notebook.slug.includes('cms-medicare') || 
    notebook.slug.includes('cdc-places') || 
    notebook.slug.includes('chronic-conditions')
  )
  
  const censusPoverty = notebooks.filter(notebook => 
    notebook.slug.includes('census')
  )
  
  return {
    'Chronic Conditions & Prescription Drugs': chronicConditions,
    'Census Poverty Analysis': censusPoverty
  }
}

export function getCategories(): string[] {
  const categories = new Set(
    notebooks
      .map(notebook => notebook.category)
      .filter((category): category is string => category !== undefined)
  )
  return Array.from(categories).sort()
}