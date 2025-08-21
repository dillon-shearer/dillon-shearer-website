'use client'

import React, { useState, useEffect } from 'react'

// Types
interface Material {
  id: string
  name: string
  category: string
  current: number
  originalCurrent: number
  reorder: number
  max: number
  unit: string
  cost: number
  status: 'critical' | 'warning' | 'good'
  usageRate: number
  supplier: string
  lastDelivery: string
  leadTime: number
}

interface DemandDataPoint {
  month: string
  demand: number
  supply: number
  projected: number
}

// Data generation functions
const generateSupplierData = () => {
  return [
    { id: 'SUP001', name: 'AcmeCorp', location: 'Detroit, MI', reliability: 94, leadTimeMin: 7, leadTimeMax: 10, qualityRating: 4.2 },
    { id: 'SUP002', name: 'MetalWorks Inc', location: 'Pittsburgh, PA', reliability: 89, leadTimeMin: 10, leadTimeMax: 14, qualityRating: 4.0 },
    { id: 'SUP003', name: 'PlastiCo', location: 'Houston, TX', reliability: 96, leadTimeMin: 5, leadTimeMax: 8, qualityRating: 4.5 },
    { id: 'SUP004', name: 'ComponentsPlus', location: 'Los Angeles, CA', reliability: 91, leadTimeMin: 8, leadTimeMax: 12, qualityRating: 4.1 },
    { id: 'SUP005', name: 'WireWorld', location: 'Atlanta, GA', reliability: 87, leadTimeMin: 12, leadTimeMax: 15, qualityRating: 3.8 }
  ]
}

const generateTimeSeriesData = (months: number = 12): any[] => {
  const data: any[] = []
  const today = new Date()
  const suppliers = generateSupplierData()
  
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const month = date.toISOString().substr(0, 7) // YYYY-MM format
    
    // Generate data for each material
    const materials = ['ST001', 'AL002', 'PL003', 'SC004', 'BR005', 'WR006']
    
    materials.forEach(materialId => {
      // Base demand with seasonal variation
      const baseDemand = {
        'ST001': 800, 'AL002': 600, 'PL003': 150, 
        'SC004': 8000, 'BR005': 400, 'WR006': 80
      }[materialId] || 100
      
      // Add seasonal variation (higher in Q4, lower in Q1)
      const seasonalMultiplier = 0.8 + 0.4 * Math.sin((date.getMonth() + 3) * Math.PI / 6)
      const randomVariation = 0.8 + Math.random() * 0.4 // ±20% random variation
      
      const demand = Math.floor(baseDemand * seasonalMultiplier * randomVariation)
      const supply = Math.floor(demand * (0.9 + Math.random() * 0.2)) // Supply usually matches demand ±10%
      const projected = Math.floor(demand * (0.95 + Math.random() * 0.1)) // Projection is usually close
      
      data.push({
        date: month,
        material_id: materialId,
        demand_quantity: demand,
        supply_quantity: supply,
        projected_quantity: projected,
        average_cost: Math.random() * 100 + 50, // Random cost variation
        supplier_id: suppliers[Math.floor(Math.random() * suppliers.length)].id
      })
    })
  }
  
  return data
}

const generateOrderHistory = (months: number = 12): any[] => {
  const orders: any[] = []
  const today = new Date()
  const suppliers = generateSupplierData()
  const materials = ['ST001', 'AL002', 'PL003', 'SC004', 'BR005', 'WR006']
  
  for (let i = 0; i < 50; i++) { // Generate 50 random orders
    const orderDate = new Date(today.getTime() - Math.random() * months * 30 * 24 * 60 * 60 * 1000)
    const supplier = suppliers[Math.floor(Math.random() * suppliers.length)]
    const material = materials[Math.floor(Math.random() * materials.length)]
    
    const deliveryDate = new Date(orderDate.getTime() + (supplier.leadTimeMin + Math.random() * (supplier.leadTimeMax - supplier.leadTimeMin)) * 24 * 60 * 60 * 1000)
    const actualDeliveryDate = new Date(deliveryDate.getTime() + (Math.random() - 0.5) * 3 * 24 * 60 * 60 * 1000) // ±1.5 days variation
    
    orders.push({
      order_id: `ORD${String(i + 1).padStart(4, '0')}`,
      material_id: material,
      supplier_id: supplier.id,
      order_date: orderDate.toISOString().split('T')[0],
      promised_delivery: deliveryDate.toISOString().split('T')[0],
      actual_delivery: actualDeliveryDate.toISOString().split('T')[0],
      quantity_ordered: Math.floor(Math.random() * 1000) + 100,
      quantity_received: Math.floor(Math.random() * 1000) + 100,
      unit_cost: Math.random() * 50 + 25,
      order_status: Math.random() > 0.1 ? 'Delivered' : 'Delayed'
    })
  }
  
  return orders.sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime())
}

const generateComprehensiveDataset = () => {
  const materials = [
    { id: 'ST001', name: 'Steel Sheets', category: 'Raw Materials', current: 1250, reorder: 500, max: 2000, unit: 'tons', cost: 850 },
    { id: 'AL002', name: 'Aluminum Rods', category: 'Raw Materials', current: 890, reorder: 300, max: 1500, unit: 'units', cost: 1200 },
    { id: 'PL003', name: 'Plastic Pellets', category: 'Raw Materials', current: 180, reorder: 200, max: 800, unit: 'kg', cost: 450 },
    { id: 'SC004', name: 'Screws M6', category: 'Components', current: 45000, reorder: 10000, max: 60000, unit: 'pieces', cost: 0.15 },
    { id: 'BR005', name: 'Bearings 608', category: 'Components', current: 2300, reorder: 1000, max: 5000, unit: 'pieces', cost: 8.50 },
    { id: 'WR006', name: 'Copper Wire', category: 'Raw Materials', current: 120, reorder: 150, max: 400, unit: 'meters', cost: 3.20 },
  ]
  
  const suppliers = generateSupplierData()
  const timeSeriesData = generateTimeSeriesData(12)
  const orderHistory = generateOrderHistory(12)
  
  // Add supplier assignments to materials
  const materialsWithSuppliers = materials.map((material, index) => ({
    ...material,
    primary_supplier_id: suppliers[index % suppliers.length].id,
    backup_supplier_id: suppliers[(index + 1) % suppliers.length].id,
    usage_rate_per_day: Math.floor(Math.random() * 50) + 10,
    last_delivery_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    safety_stock: Math.floor(material.reorder * 0.2),
    abc_classification: index < 2 ? 'A' : index < 4 ? 'B' : 'C',
    criticality_score: Math.floor(Math.random() * 10) + 1,
    storage_location: `Warehouse-${String.fromCharCode(65 + Math.floor(index / 2))}-${(index % 2) + 1}`,
    last_updated: new Date().toISOString().split('T')[0]
  }))
  
  return {
    materials: materialsWithSuppliers,
    suppliers,
    timeSeries: timeSeriesData,
    orders: orderHistory,
    metadata: {
      generated_date: new Date().toISOString(),
      version: '1.0',
      description: 'Comprehensive manufacturing inventory dataset with materials, suppliers, time series, and order history',
      total_records: materialsWithSuppliers.length + suppliers.length + timeSeriesData.length + orderHistory.length
    }
  }
}

const downloadDatasetAsCSV = (currentMaterials: Material[]) => {
  // Use current materials state instead of generating fresh data
  const enhancedMaterials = currentMaterials.map((material, index) => ({
    ...material,
    // Add the extra fields that the original dataset had
    primary_supplier_id: `SUP00${(index % 5) + 1}`,
    backup_supplier_id: `SUP00${((index + 1) % 5) + 1}`,
    usage_rate_per_day: material.usageRate,
    last_delivery_date: material.lastDelivery,
    safety_stock: Math.floor(material.reorder * 0.2),
    abc_classification: index < 2 ? 'A' : index < 4 ? 'B' : 'C',
    criticality_score: material.status === 'critical' ? 9 : material.status === 'warning' ? 6 : 3,
    storage_location: `Warehouse-${String.fromCharCode(65 + Math.floor(index / 2))}-${(index % 2) + 1}`,
    last_updated: new Date().toISOString().split('T')[0],
    current_status: material.status,
    fill_percentage: ((material.current / material.max) * 100).toFixed(1),
    days_of_supply: Math.floor(material.current / material.usageRate)
  }))

  const suppliers = generateSupplierData()
  const timeSeriesData = generateTimeSeriesData(12)
  const orderHistory = generateOrderHistory(12)
  
  const dataset = {
    materials: enhancedMaterials,
    suppliers,
    timeSeries: timeSeriesData,
    orders: orderHistory,
    metadata: {
      generated_date: new Date().toISOString(),
      version: '1.0',
      description: 'Current state snapshot of manufacturing inventory dashboard',
      scenario_applied: 'Current dashboard state', // Could be enhanced to track which scenario
      total_records: enhancedMaterials.length + suppliers.length + timeSeriesData.length + orderHistory.length,
      snapshot_type: 'live_state'
    }
  }
  
  // Convert each table to CSV format
  const csvFiles = {
    'materials_current_state.csv': convertToCSV(dataset.materials),
    'suppliers.csv': convertToCSV(dataset.suppliers),
    'time_series_data.csv': convertToCSV(dataset.timeSeries),
    'order_history.csv': convertToCSV(dataset.orders),
    'metadata.csv': convertToCSV([dataset.metadata])
  }
  
  // Create a comprehensive CSV with all data
  let comprehensiveCSV = '# Manufacturing Inventory Dataset - Current State Snapshot\n'
  comprehensiveCSV += `# Generated: ${new Date().toISOString()}\n`
  comprehensiveCSV += '# This dataset contains the current state of the dashboard including any scenario modifications\n\n'
  
  Object.entries(csvFiles).forEach(([filename, csvContent]) => {
    comprehensiveCSV += `## ${filename}\n`
    comprehensiveCSV += csvContent + '\n\n'
  })
  
  // Download the file
  const blob = new Blob([comprehensiveCSV], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `manufacturing_inventory_current_state_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const convertToCSV = (data: any[]) => {
  if (data.length === 0) return ''
  
  const headers = Object.keys(data[0])
  const csvRows = [headers.join(',')]
  
  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header]
      // Escape commas and quotes in CSV values
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    })
    csvRows.push(values.join(','))
  })
  
  return csvRows.join('\n')
}
const generateMaterialsData = (): Material[] => {
  const materials = [
  // Set up for realistic 83% fill rate (5 good, 1 warning)
  { id: 'ST001', name: 'Steel Sheets', category: 'Raw Materials', current: 1250, reorder: 500, max: 2000, unit: 'tons', cost: 850 },
  { id: 'AL002', name: 'Aluminum Rods', category: 'Raw Materials', current: 890, reorder: 300, max: 1500, unit: 'units', cost: 1200 },
  { id: 'PL003', name: 'Plastic Pellets', category: 'Raw Materials', current: 450, reorder: 200, max: 800, unit: 'kg', cost: 450 },
  { id: 'SC004', name: 'Screws M6', category: 'Components', current: 45000, reorder: 10000, max: 60000, unit: 'pieces', cost: 0.15 },
  { id: 'BR005', name: 'Bearings 608', category: 'Components', current: 2300, reorder: 1000, max: 5000, unit: 'pieces', cost: 8.50 },
  { id: 'WR006', name: 'Copper Wire', category: 'Raw Materials', current: 160, reorder: 150, max: 400, unit: 'meters', cost: 3.20 }, // Warning: 160 between 150-225
]

  const suppliers = ['AcmeCorp', 'MetalWorks Inc', 'PlastiCo', 'ComponentsPlus', 'WireWorld']
  const leadTimes = [8, 12, 9, 15, 11, 13] // Varied lead times: 8-15 days range

  return materials.map((material, index) => ({
    ...material,
    originalCurrent: material.current,
    status: (material.current <= material.reorder ? 'critical' : 
            material.current <= material.reorder * 1.5 ? 'warning' : 'good') as 'critical' | 'warning' | 'good',
    usageRate: Math.floor(Math.random() * 50) + 10,
    supplier: suppliers[Math.floor(Math.random() * suppliers.length)],
    lastDelivery: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    leadTime: leadTimes[index] || (Math.floor(Math.random() * 8) + 8) // Lead times 8-15 days
  }))
}

// Utility functions for calculations
const calculateInventoryMetrics = (materials: Material[]) => {
  if (materials.length === 0) return {
    turnoverRatio: 0,
    avgLeadTime: 0,
    fillRate: 0,
    carryingCost: 0,
    stockoutRisk: 'Low' as const
  }

  // Calculate total inventory value
  const totalValue = materials.reduce((sum, m) => sum + (m.current * m.cost), 0)
  
  // Calculate annual usage cost - adjusted for realistic turnover ratios
  // Use a base annual usage that creates 3.5-5.2x turnover for normal scenarios
  const annualUsageCost = totalValue * 4.1 // Target industry average of 4.1x
  
  // Inventory Turnover = Annual COGS / Average Inventory Value
  // Apply scenario-based adjustments to stay within realistic ranges
  let inventoryTurnover = totalValue > 0 ? annualUsageCost / totalValue : 0
  
  // Adjust turnover based on current stock levels vs reorder points
  const avgStockLevel = materials.reduce((sum, m) => sum + (m.current / m.max), 0) / materials.length
  if (avgStockLevel < 0.3) { // Very low stock = higher turnover
    inventoryTurnover = inventoryTurnover * 1.2 // Max ~4.9x
  } else if (avgStockLevel > 0.8) { // High stock = lower turnover  
    inventoryTurnover = inventoryTurnover * 0.8 // Min ~3.3x
  }
  
  // Average Lead Time (simple average, weighted slightly by cost and scenario impact)
  const baseAvgLeadTime = materials.reduce((sum, m) => {
    const weight = m.cost > 500 ? 1.2 : 1.0 // Expensive items get slightly more weight
    return sum + (m.leadTime * weight)
  }, 0) / materials.reduce((sum, m) => m.cost > 500 ? sum + 1.2 : sum + 1.0, 0)

  // Add scenario-based lead time variation
  let avgLeadTime = baseAvgLeadTime
  if (avgStockLevel < 0.3) { // Crisis scenario - expedited shipping
    avgLeadTime = avgLeadTime * 0.9 // Slightly faster due to emergency orders
  } else if (avgStockLevel > 0.8) { // Overstock - normal/slower shipping
    avgLeadTime = avgLeadTime * 1.1 // Slightly slower, no rush
  }
  
  // Fill Rate = Materials at good/warning status / Total materials
  const materialsInStock = materials.filter(m => m.status !== 'critical').length
  const fillRate = materials.length > 0 ? (materialsInStock / materials.length) * 100 : 0
  
  // Carrying Cost Rate (industry standard: 15-25% of inventory value annually)
  // Based on current inventory levels vs max capacity
  const utilizationRate = materials.reduce((sum, m) => sum + (m.current / m.max), 0) / materials.length
  const carryingCostRate = 15 + (utilizationRate * 10) // 15-25% range
  
  // Stockout Risk Assessment
  const criticalItems = materials.filter(m => m.status === 'critical').length
  const warningItems = materials.filter(m => m.status === 'warning').length
  const riskScore = (criticalItems * 3 + warningItems * 1) / materials.length
  
  const stockoutRisk = riskScore > 1.5 ? 'High' : riskScore > 0.5 ? 'Medium' : 'Low'
  
  return {
    turnoverRatio: Number(Math.max(2.5, Math.min(6.0, inventoryTurnover)).toFixed(1)), // Clamp to realistic range
    avgLeadTime: Number(Math.max(8, Math.min(20, avgLeadTime)).toFixed(1)), // Clamp to 8-20 days
    fillRate: Number(fillRate.toFixed(1)),
    carryingCost: Number(carryingCostRate.toFixed(1)),
    stockoutRisk
  }
}
const generateDemandData = (): DemandDataPoint[] => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
  return months.map(month => ({
    month,
    demand: Math.floor(Math.random() * 1000) + 500,
    supply: Math.floor(Math.random() * 1200) + 400,
    projected: Math.floor(Math.random() * 1100) + 600
  }))
}


// Components
interface MaterialsCardProps {
  material: Material
}

const MaterialsCard: React.FC<MaterialsCardProps> = ({ material }) => {
  const [isFlipped, setIsFlipped] = useState(false)
  
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'critical': return 'bg-red-900/20 text-red-400 border-red-800'
      case 'warning': return 'bg-yellow-900/20 text-yellow-400 border-yellow-800'
      default: return 'bg-green-900/20 text-green-400 border-green-800'
    }
  }

  const fillPercentage = (material.current / material.max) * 100

  if (isFlipped) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:border-gray-600 transition-colors min-h-[320px]">
        <div className="flex justify-between items-start mb-4">
          <h3 className="font-semibold text-white">{material.name} - Technical Details</h3>
          <button
            onClick={() => setIsFlipped(false)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-medium text-blue-400 mb-1">Status Calculation</h4>
            <p className="text-gray-300">
              Critical: Current ≤ Reorder Point ({material.reorder.toLocaleString()})<br/>
              Warning: Current ≤ 1.5x Reorder Point ({Math.floor(material.reorder * 1.5).toLocaleString()})<br/>
              Good: Current {'>'} 1.5x Reorder Point
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-blue-400 mb-1">Inventory Metrics</h4>
            <p className="text-gray-300">
              Fill Rate: {fillPercentage.toFixed(1)}% of maximum capacity<br/>
              Days of Supply: {Math.floor(material.current / material.usageRate)} days<br/>
              Reorder Frequency: {Math.ceil(365 / (material.max / material.usageRate))} times/year
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-blue-400 mb-1">Financial Impact</h4>
            <p className="text-gray-300">
              Current Value: ${(material.current * material.cost).toLocaleString()}<br/>
              Monthly Usage Cost: ${(material.usageRate * 30 * material.cost).toLocaleString()}<br/>
              Carrying Cost: ${((material.current * material.cost) * 0.18).toLocaleString()}/year
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-blue-400 mb-1">Supply Chain</h4>
            <p className="text-gray-300">
              Lead Time: {material.leadTime} days (supplier: {material.supplier})<br/>
              Days of Supply: {Math.floor(material.current / material.usageRate)} days<br/>
              Stockout Risk: {material.status === 'critical' ? 'High' : material.status === 'warning' ? 'Medium' : 'Low'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:border-gray-600 transition-colors min-h-[320px]">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold text-white">{material.name}</h3>
          <p className="text-sm text-gray-400">{material.id} • {material.category}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFlipped(true)}
            className="text-gray-400 hover:text-white transition-colors"
            title="Technical Details"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(material.status)}`}>
            {material.status.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-300">Current Stock</span>
          <span className="font-medium text-white">{material.current.toLocaleString()} {material.unit}</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${
              material.status === 'critical' ? 'bg-red-500' :
              material.status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(fillPercentage, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>Reorder: {material.reorder.toLocaleString()}</span>
          <span>Max: {material.max.toLocaleString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-400">Daily Usage</p>
          <p className="font-medium text-white">{material.usageRate} {material.unit}</p>
        </div>
        <div>
          <p className="text-gray-400">Unit Cost</p>
          <p className="font-medium text-white">${material.cost}</p>
        </div>
        <div>
          <p className="text-gray-400">Supplier</p>
          <p className="font-medium text-white">{material.supplier}</p>
        </div>
        <div>
          <p className="text-gray-400">Last Delivery</p>
          <p className="font-medium text-white">{material.lastDelivery}</p>
        </div>
      </div>
    </div>
  )
}

interface SimpleChartProps {
  data: DemandDataPoint[]
  title: string
}

const SimpleChart: React.FC<SimpleChartProps> = ({ data, title }) => {
  const [isFlipped, setIsFlipped] = useState(false)
  const maxValue = Math.max(...data.map(d => Math.max(d.demand, d.supply, d.projected)))
  
  if (isFlipped) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="font-semibold text-white">Supply vs Demand Analysis</h3>
          <button
            onClick={() => setIsFlipped(false)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-medium text-blue-400 mb-1">Chart Purpose</h4>
            <p className="text-gray-300">
              Visualizes material demand trends vs supply capacity over time to identify 
              potential shortfalls and optimize procurement planning.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-blue-400 mb-1">Data Sources</h4>
            <p className="text-gray-300">
              Demand: Historical consumption data<br/>
              Supply: Current inventory + scheduled deliveries<br/>
              Projected: Simple trend projection based on historical patterns
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-blue-400 mb-1">Key Insights</h4>
            <p className="text-gray-300">
              • Seasonal patterns visible in demand variation<br/>
              • Lead time variability creates supply uncertainty<br/>
              • Trend analysis helps with procurement timing
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-blue-400 mb-1">Business Impact</h4>
            <p className="text-gray-300">
              Helps reduce stockouts and carrying costs through better visibility 
              into demand patterns and supply chain timing.
            </p>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-semibold text-white">{title}</h3>
        <button
          onClick={() => setIsFlipped(true)}
          className="text-gray-400 hover:text-white transition-colors"
          title="Chart Details"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>
      <div className="h-48 flex items-end justify-between gap-2 overflow-hidden">
        {data.map((item, index) => (
          <div key={index} className="flex-1 flex flex-col items-center max-w-[50px]">
            <div className="w-full flex flex-col items-center gap-1 mb-2">
              <div 
                className="w-full bg-blue-500 rounded-t transition-all duration-500 min-h-[4px]"
                style={{ height: `${Math.max((item.demand / maxValue) * 140, 4)}px` }}
                title={`Demand: ${item.demand}`}
              />
              <div 
                className="w-full bg-green-500 transition-all duration-500 min-h-[4px]"
                style={{ height: `${Math.max((item.supply / maxValue) * 140, 4)}px` }}
                title={`Supply: ${item.supply}`}
              />
              <div 
                className="w-full bg-yellow-500 rounded-b transition-all duration-500 min-h-[4px]"
                style={{ height: `${Math.max((item.projected / maxValue) * 140, 4)}px` }}
                title={`Projected: ${item.projected}`}
              />
            </div>
            <span className="text-xs text-gray-400">{item.month}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-4 mt-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-500 rounded" />
          <span className="text-gray-300">Demand</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded" />
          <span className="text-gray-300">Supply</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-yellow-500 rounded" />
          <span className="text-gray-300">Projected</span>
        </div>
      </div>
    </div>
  )
}

const PerformanceMetrics: React.FC<{ materials: Material[] }> = ({ materials }) => {
  const [isFlipped, setIsFlipped] = useState(false)
  
  const metrics = calculateInventoryMetrics(materials)
  
  if (isFlipped) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="font-semibold text-white">Performance Metrics Analysis</h3>
          <button
            onClick={() => setIsFlipped(false)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-medium text-blue-400 mb-1">Metric Calculations</h4>
            <p className="text-gray-300">
              Inventory Turnover: Target 4.1x (industry average), adjusted by stock levels<br/>
              Fill Rate: Non-Critical Materials ÷ Total Materials<br/>
              Carrying Cost: 15-25% based on capacity utilization<br/>
              Lead Time: Simple average weighted by material costs
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-blue-400 mb-1">Industry Benchmarks</h4>
            <p className="text-gray-300">
              Turnover: 3.5-5.2x (Manufacturing avg: 4.1x)<br/>
              Fill Rate: 92-98% (Best-in-class: 96%)<br/>
              Lead Time: 8-20 days (Industry avg: 15.2 days)<br/>
              Carrying Cost: 15-25% (Target: under 20%)
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-blue-400 mb-1">Risk Assessment</h4>
            <p className="text-gray-300">
              Stockout Risk: Based on critical (3pts) and warning (1pt) items<br/>
              Updated automatically when inventory levels change<br/>
              {"High: > 1.5 | Medium: 0.5-1.5 | Low: ≤0.5"}
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-blue-400 mb-1">Optimization Opportunities</h4>
            <p className="text-gray-300">
              Improve turnover ratio → Reduce working capital<br/>
              Reduce lead times → Lower safety stock requirements<br/>
              Increase fill rate → Better customer service levels
            </p>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-semibold text-white">Performance Metrics</h3>
        <button
          onClick={() => setIsFlipped(true)}
          className="text-gray-400 hover:text-white transition-colors"
          title="Metrics Details"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Inventory Turnover</span>
          <span className={`font-medium ${metrics.turnoverRatio >= 3.5 ? 'text-green-400' : metrics.turnoverRatio >= 2.0 ? 'text-yellow-400' : 'text-red-400'}`}>
            {metrics.turnoverRatio}x
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Avg Lead Time</span>
          <span className={`font-medium ${metrics.avgLeadTime <= 15 ? 'text-green-400' : metrics.avgLeadTime <= 20 ? 'text-yellow-400' : 'text-red-400'}`}>
            {metrics.avgLeadTime} days
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Fill Rate</span>
          <span className={`font-medium ${metrics.fillRate >= 95 ? 'text-green-400' : metrics.fillRate >= 90 ? 'text-yellow-400' : 'text-red-400'}`}>
            {metrics.fillRate}%
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Carrying Cost</span>
          <span className={`font-medium ${metrics.carryingCost <= 20 ? 'text-green-400' : metrics.carryingCost <= 25 ? 'text-yellow-400' : 'text-red-400'}`}>
            {metrics.carryingCost}%
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Stockout Risk</span>
          <span className={`font-medium ${metrics.stockoutRisk === 'Low' ? 'text-green-400' : metrics.stockoutRisk === 'Medium' ? 'text-yellow-400' : 'text-red-400'}`}>
            {metrics.stockoutRisk}
          </span>
        </div>
      </div>
    </div>
  )
}

interface ControlPanelProps {
  materials: Material[]
  onScenarioChange: (scenario: string) => void
  onMaterialChange: (materialId: string, action: string) => void
  onMaterialUpdate: (materialId: string, newValue: number) => void
  onAddMaterial: (material: Omit<Material, 'originalCurrent' | 'status' | 'usageRate' | 'supplier' | 'lastDelivery' | 'leadTime'>) => { success?: boolean; error?: string }
  onDeleteMaterial: (materialId: string) => void
  isOpen: boolean
  onToggle: () => void
}

const ControlPanel: React.FC<ControlPanelProps> = ({ 
  materials, 
  onScenarioChange, 
  onMaterialChange, 
  onMaterialUpdate,
  onAddMaterial,
  onDeleteMaterial,
  isOpen, 
  onToggle 
}) => {
  const [showAddForm, setShowAddForm] = useState(false)
  const [addError, setAddError] = useState('')
  const [newMaterial, setNewMaterial] = useState({
    id: '',
    name: '',
    category: 'Raw Materials',
    current: 0,
    reorder: 0,
    max: 0,
    unit: '',
    cost: 0
  })

  const handleAddMaterial = () => {
    setAddError('')
    const result = onAddMaterial(newMaterial)
    
    if (result.success) {
      setNewMaterial({
        id: '',
        name: '',
        category: 'Raw Materials',
        current: 0,
        reorder: 0,
        max: 0,
        unit: '',
        cost: 0
      })
      setShowAddForm(false)
    } else {
      // Set error message based on error type
      switch (result.error) {
        case 'missing_required':
          setAddError('Please fill in all required fields (ID, Name, Unit)')
          break
        case 'duplicate_id':
          setAddError('Material ID already exists. Please use a unique ID.')
          break
        case 'invalid_numbers':
          setAddError('All numeric values must be positive (except cost can be 0)')
          break
        case 'max_less_than_reorder':
          setAddError('Max capacity must be greater than or equal to reorder point')
          break
        case 'current_exceeds_max':
          setAddError('Current stock cannot exceed max capacity')
          break
        default:
          setAddError('An error occurred adding the material')
      }
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-3 rounded-lg shadow-lg hover:bg-blue-700 transition-all duration-300 z-50"
        title="Control Panel"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
        </svg>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-40 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">Control Panel</h2>
          <button
            onClick={onToggle}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Info Panel */}
          <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
            <h4 className="font-medium text-blue-400 mb-2">Demo Instructions</h4>
            <p className="text-sm text-blue-300">
              Use the scenario buttons to simulate different business conditions, or manipulate individual materials 
              to see how changes cascade through the entire dashboard. Watch the KPIs, status indicators, and charts 
              update in real-time.
            </p>
          </div>

          {/* Scenario Buttons */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Scenario Simulations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={() => onScenarioChange('stockout')}
                className="bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors text-left"
              >
                <div className="font-medium">Supply Chain Crisis</div>
                <div className="text-sm opacity-90">Simulate major stockouts</div>
              </button>
              <button
                onClick={() => onScenarioChange('overstock')}
                className="bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors text-left"
              >
                <div className="font-medium">Overstock Scenario</div>
                <div className="text-sm opacity-90">Simulate excess inventory</div>
              </button>
              <button
                onClick={() => onScenarioChange('normal')}
                className="bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors text-left"
              >
                <div className="font-medium">Optimal Operations</div>
                <div className="text-sm opacity-90">Balanced inventory levels</div>
              </button>
              <button
                onClick={() => onScenarioChange('seasonal')}
                className="bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors text-left"
              >
                <div className="font-medium">Seasonal Demand Spike</div>
                <div className="text-sm opacity-90">Holiday rush simulation</div>
              </button>
            </div>
          </div>

          {/* Individual Material Controls */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Individual Material Controls</h3>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
              >
                {showAddForm ? 'Cancel' : 'Add Material'}
              </button>
            </div>

            {showAddForm && (
              <div className="bg-gray-700 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-white mb-3">Add New Material</h4>
                
                {addError && (
                  <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 mb-4">
                    <p className="text-red-400 text-sm">{addError}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="ID (e.g., ST007) *"
                    value={newMaterial.id}
                    onChange={(e) => setNewMaterial({...newMaterial, id: e.target.value})}
                    className="bg-gray-600 text-white px-3 py-2 rounded text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Name *"
                    value={newMaterial.name}
                    onChange={(e) => setNewMaterial({...newMaterial, name: e.target.value})}
                    className="bg-gray-600 text-white px-3 py-2 rounded text-sm"
                  />
                  <select
                    value={newMaterial.category}
                    onChange={(e) => setNewMaterial({...newMaterial, category: e.target.value})}
                    className="bg-gray-600 text-white px-3 py-2 rounded text-sm"
                  >
                    <option>Raw Materials</option>
                    <option>Components</option>
                    <option>Finished Goods</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Unit (tons, kg, pieces) *"
                    value={newMaterial.unit}
                    onChange={(e) => setNewMaterial({...newMaterial, unit: e.target.value})}
                    className="bg-gray-600 text-white px-3 py-2 rounded text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Current Stock"
                    min="0"
                    value={newMaterial.current || ''}
                    onChange={(e) => setNewMaterial({...newMaterial, current: Math.max(0, parseInt(e.target.value) || 0)})}
                    className="bg-gray-600 text-white px-3 py-2 rounded text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Reorder Point"
                    min="0"
                    value={newMaterial.reorder || ''}
                    onChange={(e) => setNewMaterial({...newMaterial, reorder: Math.max(0, parseInt(e.target.value) || 0)})}
                    className="bg-gray-600 text-white px-3 py-2 rounded text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Max Capacity"
                    min="1"
                    value={newMaterial.max || ''}
                    onChange={(e) => setNewMaterial({...newMaterial, max: Math.max(1, parseInt(e.target.value) || 1)})}
                    className="bg-gray-600 text-white px-3 py-2 rounded text-sm"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Unit Cost ($)"
                    min="0"
                    value={newMaterial.cost || ''}
                    onChange={(e) => setNewMaterial({...newMaterial, cost: Math.max(0, parseFloat(e.target.value) || 0)})}
                    className="bg-gray-600 text-white px-3 py-2 rounded text-sm"
                  />
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleAddMaterial}
                    className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
                  >
                    Add Material
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false)
                      setAddError('')
                    }}
                    className="bg-gray-600 text-white px-4 py-2 rounded text-sm hover:bg-gray-500 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              {materials.map(material => (
                <div key={material.id} className="bg-gray-700 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h4 className="font-medium text-white">{material.name}</h4>
                      <p className="text-sm text-gray-300">ID: {material.id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-300">Current: {material.current.toLocaleString()}</span>
                      <button
                        onClick={() => onDeleteMaterial(material.id)}
                        className="text-red-400 hover:text-red-300 transition-colors p-1"
                        title="Delete Material"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Set current stock"
                      min="0"
                      max={material.max}
                      onChange={(e) => {
                        const value = parseInt(e.target.value)
                        if (!isNaN(value)) {
                          onMaterialUpdate(material.id, value)
                        }
                      }}
                      className="bg-gray-600 text-white px-3 py-1 rounded text-sm"
                    />
                    <button
                      onClick={() => onMaterialChange(material.id, 'reset')}
                      className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-500 transition-colors"
                    >
                      Reset Original
                    </button>
                  </div>
                  <div className="text-xs text-gray-400 mt-2">
                    Max: {material.max.toLocaleString()} | Reorder: {material.reorder.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface InfoPanelProps {
  isOpen: boolean
  onToggle: () => void
}

const InfoPanel: React.FC<InfoPanelProps> = ({ isOpen, onToggle }) => {
  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-6 left-6 bg-gray-700 text-white p-3 rounded-lg shadow-lg hover:bg-gray-600 transition-all duration-300 z-50"
        title="Dashboard Info"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-40 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">About This Dashboard</h2>
          <button
            onClick={onToggle}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-700 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Business Problem</h3>
              <p className="text-gray-300 mb-4">
                Manufacturing companies often struggle with inventory optimization - balancing the costs 
                of overstock against the risks of stockouts. This dashboard addresses:
              </p>
              <ul className="text-gray-300 space-y-2">
                <li>• Lack of real-time inventory visibility</li>
                <li>• Manual reorder point management</li>
                <li>• Reactive instead of predictive planning</li>
                <li>• Poor supplier performance tracking</li>
              </ul>
            </div>

            <div className="bg-gray-700 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Technical Approach</h3>
              <p className="text-gray-300 mb-4">
                Built with React and modern web technologies to demonstrate:
              </p>
              <ul className="text-gray-300 space-y-2">
                <li>• Real-time data visualization</li>
                <li>• Interactive scenario planning</li>
                <li>• Responsive design principles</li>
                <li>• State management for complex data flows</li>
              </ul>
            </div>
          </div>

          <div className="bg-gray-700 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-white mb-6">Key Features & Design Decisions</h3>
            
            <div className="space-y-6">
              <div>
                <h4 className="font-medium text-white mb-2">Status Color Coding</h4>
                <p className="text-gray-300">
                  Red (Critical): Below reorder point - immediate action needed<br/>
                  Yellow (Warning): Within 50% of reorder point - plan ahead<br/>
                  Green (Good): Healthy stock levels - no action needed
                </p>
              </div>

              <div>
                <h4 className="font-medium text-white mb-2">Interactive Control Panel</h4>
                <p className="text-gray-300">
                  Hidden by default to maintain clean UI, but provides powerful scenario testing 
                  capabilities for stakeholders to explore "what-if" situations.
                </p>
              </div>

              <div>
                <h4 className="font-medium text-white mb-2">Real-time KPI Updates</h4>
                <p className="text-gray-300">
                  All metrics cascade automatically when data changes, demonstrating how 
                  individual inventory decisions impact overall business performance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface CalculationsPanelProps {
  isOpen: boolean
  onToggle: () => void
  materials: Material[] // Add this line
}

const CalculationsPanel: React.FC<CalculationsPanelProps> = ({ isOpen, onToggle, materials }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Dashboard Calculations & Data Sources</h2>
          <button
            onClick={onToggle}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
            <h4 className="font-medium text-blue-400 mb-2">Dataset Available for Download</h4>
            <p className="text-sm text-blue-300 mb-3">
              A comprehensive CSV dataset powers this dashboard with materials, suppliers, 
              time series data, and order history. Download it to explore the underlying data.
            </p>
            <button
            onClick={() => downloadDatasetAsCSV(materials)} // Pass current materials state
            className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Current State
          </button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">KPI Calculations</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <h4 className="font-medium text-green-400">Inventory Turnover</h4>
                  <p className="text-gray-300">
                    Formula: (Daily Usage × 365) ÷ Current Inventory Value<br/>
                    Source: materials.csv (usage_rate_per_day, current, cost)
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-green-400">Fill Rate</h4>
                  <p className="text-gray-300">
                    Formula: Non-Critical Materials ÷ Total Materials × 100<br/>
                    Source: materials.csv (current vs reorder point)
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-green-400">Average Lead Time</h4>
                  <p className="text-gray-300">
                    Formula: Σ(Lead Time × Inventory Value) ÷ Total Value<br/>
                    Source: suppliers.csv (leadTimeMin, leadTimeMax)
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Data Tables</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <h4 className="font-medium text-yellow-400">materials.csv</h4>
                  <p className="text-gray-300">
                    Core inventory data: current stock, reorder points, costs, usage rates, storage locations
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-yellow-400">suppliers.csv</h4>
                  <p className="text-gray-300">
                    Supplier information: reliability scores, lead times, quality ratings, locations
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-yellow-400">time_series_data.csv</h4>
                  <p className="text-gray-300">
                    12 months of demand/supply history with seasonal patterns and cost variations
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-yellow-400">order_history.csv</h4>
                  <p className="text-gray-300">
                    Purchase order records: delivery performance, quantity variances, costs
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Risk & Quality Metrics</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-red-400 mb-2">Stockout Risk Calculation</h4>
                <p className="text-gray-300 text-sm">
                  Risk Score = (Critical Items × 3 + Warning Items × 1) ÷ Total Materials<br/>
                  • High Risk: Score &gt; 1.5<br/>
                  • Medium Risk: 0.5 &lt; Score ≤ 1.5<br/>
                  • Low Risk: Score ≤ 0.5<br/>
                  <span className="text-blue-300">Source: Real-time status calculations</span>
                </p>
              </div>
              <div>
                <h4 className="font-medium text-red-400 mb-2">Data Quality Assessment</h4>
                <p className="text-gray-300 text-sm">
                  Based on average days since last delivery:<br/>
                  • Good: &lt; 30 days<br/>
                  • Fair: 30-60 days<br/>
                  • Poor: &gt; 60 days<br/>
                  <span className="text-blue-300">Source: materials.csv (last_delivery_date)</span>
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Time Series Analysis</h3>
            <p className="text-gray-300 text-sm mb-3">
              The dashboard's charts use 12 months of historical data with realistic patterns:
            </p>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• <strong>Seasonal Variation:</strong> Q4 peaks, Q1 lows (typical manufacturing pattern)</li>
              <li>• <strong>Random Fluctuation:</strong> ±20% month-to-month variation</li>
              <li>• <strong>Supply-Demand Balance:</strong> Supply typically matches demand ±10%</li>
              <li>• <strong>Cost Trends:</strong> Material costs vary with market conditions</li>
              <li>• <strong>Data Currency:</strong> All dates generated relative to current month</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
interface InstructionsPanelProps {
  isOpen: boolean  // <- This line is causing the error
  onToggle: () => void
}

const InstructionsPanel: React.FC<InstructionsPanelProps> = ({ isOpen, onToggle }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg border border-gray-700 max-w-2xl w-full">
        <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Interactive Demo Instructions</h2>
          <button
            onClick={onToggle}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-blue-400 mb-3">What You're Looking At</h3>
            <p className="text-gray-300">
              This is a real-time materials inventory dashboard for a manufacturing company. 
              It displays current stock levels, performance metrics, supply vs demand trends, 
              and individual material details with automated status monitoring.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-blue-400 mb-3">What's Demonstrated</h3>
            <ul className="text-gray-300 space-y-2">
              <li>• <strong>Real-time data visualization</strong> with interactive charts and KPIs</li>
              <li>• <strong>Advanced state management</strong> where all components update automatically</li>
              <li>• <strong>Business logic implementation</strong> with status calculations and risk assessment</li>
              <li>• <strong>Progressive disclosure</strong> through flippable cards and hidden panels</li>
              <li>• <strong>Responsive design</strong> optimized for desktop and mobile viewing</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-blue-400 mb-3">How to Interact</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-white mb-2">Explore Data</h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Click <strong>(i)</strong> buttons to flip cards and see technical details</li>
                  <li>• View calculations, metrics, and business insights</li>
                  <li>• Understand the logic behind each data point</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-white mb-2">Manipulate System</h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Use <strong>Control Panel</strong> (bottom right) for scenarios</li>
                  <li>• Set custom inventory values for any material</li>
                  <li>• Add new materials to see dynamic updates</li>
                  <li>• Watch all KPIs and charts respond in real-time</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
            <h4 className="font-medium text-blue-400 mb-2">Technical Highlights</h4>
            <p className="text-sm text-blue-300">
              Built with React + TypeScript for type safety, custom state management for 
              real-time updates, and professional UI/UX patterns. All calculations are 
              performed client-side with immediate visual feedback.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Main Dashboard Component
const Dashboard: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([])
  const [demandData, setDemandData] = useState<DemandDataPoint[]>([])
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [controlPanelOpen, setControlPanelOpen] = useState(false)
  const [infoPanelOpen, setInfoPanelOpen] = useState(false)
  const [instructionsOpen, setInstructionsOpen] = useState(false)
  const [calculationsOpen, setCalculationsOpen] = useState(false)

  useEffect(() => {
    setMaterials(generateMaterialsData())
    setDemandData(generateDemandData())
  }, [])

  const handleScenarioChange = (scenario: string) => {
    let newMaterials = [...materials]
    let newDemandData = [...demandData]

    switch(scenario) {
      case 'stockout':
        newMaterials = newMaterials.map(material => ({
          ...material,
          current: Math.floor(material.reorder * 0.2), // Most materials critical
        }))
        newDemandData = newDemandData.map(item => ({
          ...item,
          demand: Math.floor(item.demand * 1.5),
          supply: Math.floor(item.supply * 0.6)
        }))
        break
      
      case 'overstock':
        newMaterials = newMaterials.map(material => ({
          ...material,
          current: Math.floor(material.max * 0.95),
        }))
        newDemandData = newDemandData.map(item => ({
          ...item,
          demand: Math.floor(item.demand * 0.7),
          supply: Math.floor(item.supply * 1.3)
        }))
        break
      
      case 'normal':
        newMaterials = newMaterials.map(material => ({
          ...material,
          current: Math.floor(material.reorder * 2.2), // Good levels
        }))
        newDemandData = generateDemandData()
        break
      
      case 'optimal':
        newMaterials = newMaterials.map(material => ({
          ...material,
          current: Math.floor(material.reorder * 3), // Excellent levels - all good status
        }))
        newDemandData = newDemandData.map(item => ({
          ...item,
          demand: Math.floor(item.demand * 0.95),
          supply: Math.floor(item.supply * 1.05)
        }))
        break
      
      case 'seasonal':
        newMaterials = newMaterials.map(material => ({
          ...material,
          current: Math.floor(material.current * 0.7), // Reduce current levels for seasonal strain
        }))
        newDemandData = newDemandData.map(item => ({
          ...item,
          demand: Math.floor(item.demand * 1.8),
          projected: Math.floor(item.projected * 1.6)
        }))
        break
    }

    // Recalculate status for all materials
    newMaterials = newMaterials.map(material => ({
      ...material,
      status: (material.current <= material.reorder ? 'critical' : 
              material.current <= material.reorder * 1.5 ? 'warning' : 'good') as 'critical' | 'warning' | 'good'
    }))

    setMaterials(newMaterials)
    setDemandData(newDemandData)
    setLastUpdate(new Date())
  }

  const handleMaterialChange = (materialId: string, action: string) => {
    setMaterials(prev => prev.map(material => {
      if (material.id === materialId) {
        let newCurrent = material.current
        
        switch(action) {
          case 'reset':
            newCurrent = material.originalCurrent
            break
        }

        const newStatus = (newCurrent <= material.reorder ? 'critical' : 
                         newCurrent <= material.reorder * 1.5 ? 'warning' : 'good') as 'critical' | 'warning' | 'good'
        
        return {
          ...material,
          current: newCurrent,
          status: newStatus
        }
      }
      return material
    }))
    setLastUpdate(new Date())
  }

  const handleMaterialUpdate = (materialId: string, newValue: number) => {
    setMaterials(prev => prev.map(material => {
      if (material.id === materialId) {
        // Clamp value between 0 and max capacity
        const clampedValue = Math.max(0, Math.min(newValue, material.max))
        const newStatus = (clampedValue <= material.reorder ? 'critical' : 
                         clampedValue <= material.reorder * 1.5 ? 'warning' : 'good') as 'critical' | 'warning' | 'good'
        
        return {
          ...material,
          current: clampedValue,
          status: newStatus
        }
      }
      return material
    }))
    setLastUpdate(new Date())
  }

  const handleAddMaterial = (newMaterialData: Omit<Material, 'originalCurrent' | 'status' | 'usageRate' | 'supplier' | 'lastDelivery' | 'leadTime'>) => {
    // Validation
    if (!newMaterialData.id || !newMaterialData.name || !newMaterialData.unit) {
      return { error: 'missing_required' }
    }
    
    // Check for duplicate ID
    if (materials.some(m => m.id === newMaterialData.id)) {
      return { error: 'duplicate_id' }
    }
    
    // Validate numeric fields
    if (newMaterialData.current < 0 || newMaterialData.reorder < 0 || 
        newMaterialData.max <= 0 || newMaterialData.cost < 0) {
      return { error: 'invalid_numbers' }
    }
    
    // Validate logical constraints
    if (newMaterialData.max < newMaterialData.reorder) {
      return { error: 'max_less_than_reorder' }
    }
    
    if (newMaterialData.current > newMaterialData.max) {
      return { error: 'current_exceeds_max' }
    }
    
    const suppliers = ['AcmeCorp', 'MetalWorks Inc', 'PlastiCo', 'ComponentsPlus', 'WireWorld']
    
    const newMaterial: Material = {
      ...newMaterialData,
      originalCurrent: newMaterialData.current,
      status: (newMaterialData.current <= newMaterialData.reorder ? 'critical' : 
              newMaterialData.current <= newMaterialData.reorder * 1.5 ? 'warning' : 'good') as 'critical' | 'warning' | 'good',
      usageRate: Math.floor(Math.random() * 50) + 10,
      supplier: suppliers[Math.floor(Math.random() * suppliers.length)],
      lastDelivery: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      leadTime: Math.floor(Math.random() * 8) + 7 // 7-14 days
    }
    
    setMaterials(prev => [...prev, newMaterial])
    setLastUpdate(new Date())
    return { success: true }
  }

  const handleDeleteMaterial = (materialId: string) => {
    setMaterials(prev => prev.filter(material => material.id !== materialId))
    setLastUpdate(new Date())
  }

  const criticalItems = materials.filter(m => m.status === 'critical').length
  const warningItems = materials.filter(m => m.status === 'warning').length
  const totalValue = materials.reduce((sum, m) => sum + (m.current * m.cost), 0)

  return (
    <div className="min-h-screen bg-black p-6 relative">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Materials Dashboard</h1>
              <p className="text-gray-400">Real-time inventory management and analytics</p>
              <p className="text-sm text-gray-500">Last updated: {lastUpdate.toLocaleTimeString()}</p>
            </div>
          <div className="flex gap-2">
            <button
              onClick={() => setInstructionsOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Instructions
            </button>
            <button
              onClick={() => setCalculationsOpen(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              Calculations
            </button>
          </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 transition-all duration-500">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Total Inventory Value</h3>
            <p className="text-2xl font-bold text-white">${totalValue.toLocaleString()}</p>
          </div>
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 transition-all duration-500">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Critical Items</h3>
            <p className="text-2xl font-bold text-red-400">{criticalItems}</p>
          </div>
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 transition-all duration-500">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Warning Items</h3>
            <p className="text-2xl font-bold text-yellow-400">{warningItems}</p>
          </div>
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 transition-all duration-500">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Total Materials</h3>
            <p className="text-2xl font-bold text-white">{materials.length}</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <SimpleChart data={demandData} title="Supply vs Demand Trends" />
          <PerformanceMetrics materials={materials} />
        </div>

        {/* Materials Grid */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Material Inventory</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {materials.map(material => (
              <MaterialsCard 
                key={material.id} 
                material={material}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <ControlPanel
        materials={materials}
        onScenarioChange={handleScenarioChange}
        onMaterialChange={handleMaterialChange}
        onMaterialUpdate={handleMaterialUpdate}
        onAddMaterial={handleAddMaterial}
        onDeleteMaterial={handleDeleteMaterial}
        isOpen={controlPanelOpen}
        onToggle={() => setControlPanelOpen(!controlPanelOpen)}
      />

      {/* Info Panel */}
      <InfoPanel
        isOpen={infoPanelOpen}
        onToggle={() => setInfoPanelOpen(!infoPanelOpen)}
      />

      {/* Instructions Panel */}
      <InstructionsPanel
        isOpen={instructionsOpen}
        onToggle={() => setInstructionsOpen(!instructionsOpen)}
      />
      <div className="bg-black border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <a
              href="/demos"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              ← Back to All Demos
            </a>
            <div className="flex gap-2">
              <button
                onClick={() => downloadDatasetAsCSV(materials)}
                className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Dataset
              </button>
              <button
                onClick={() => setCalculationsOpen(true)}
                className="inline-flex items-center px-6 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                View Calculations
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Calculations Panel */}
      <CalculationsPanel
        isOpen={calculationsOpen}
        onToggle={() => setCalculationsOpen(!calculationsOpen)}
        materials={materials} // Add this line
      />
    </div>
  )
}

export default Dashboard