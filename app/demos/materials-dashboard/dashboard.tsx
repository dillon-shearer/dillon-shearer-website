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
}

interface DemandDataPoint {
  month: string
  demand: number
  supply: number
  forecast: number
}

// Dummy data generation
const generateMaterialsData = (): Material[] => {
  const materials = [
    { id: 'ST001', name: 'Steel Sheets', category: 'Raw Materials', current: 1250, reorder: 500, max: 2000, unit: 'tons', cost: 850 },
    { id: 'AL002', name: 'Aluminum Rods', category: 'Raw Materials', current: 890, reorder: 300, max: 1500, unit: 'units', cost: 1200 },
    { id: 'PL003', name: 'Plastic Pellets', category: 'Raw Materials', current: 180, reorder: 200, max: 800, unit: 'kg', cost: 450 },
    { id: 'SC004', name: 'Screws M6', category: 'Components', current: 45000, reorder: 10000, max: 60000, unit: 'pieces', cost: 0.15 },
    { id: 'BR005', name: 'Bearings 608', category: 'Components', current: 2300, reorder: 1000, max: 5000, unit: 'pieces', cost: 8.50 },
    { id: 'WR006', name: 'Copper Wire', category: 'Raw Materials', current: 120, reorder: 150, max: 400, unit: 'meters', cost: 3.20 },
  ]

  const suppliers = ['AcmeCorp', 'MetalWorks Inc', 'PlastiCo', 'ComponentsPlus', 'WireWorld']

  return materials.map(material => ({
    ...material,
    originalCurrent: material.current,
    status: (material.current <= material.reorder ? 'critical' : 
            material.current <= material.reorder * 1.5 ? 'warning' : 'good') as 'critical' | 'warning' | 'good',
    usageRate: Math.floor(Math.random() * 50) + 10,
    supplier: suppliers[Math.floor(Math.random() * suppliers.length)],
    lastDelivery: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  }))
}

const generateDemandData = (): DemandDataPoint[] => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
  return months.map(month => ({
    month,
    demand: Math.floor(Math.random() * 1000) + 500,
    supply: Math.floor(Math.random() * 1200) + 400,
    forecast: Math.floor(Math.random() * 1100) + 600
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
              Lead Time: 7-14 days (supplier dependent)<br/>
              Quality Rating: {(85 + Math.random() * 10).toFixed(1)}%<br/>
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
  const maxValue = Math.max(...data.map(d => Math.max(d.demand, d.supply, d.forecast)))
  
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
              Demand: Historical consumption + seasonal adjustments<br/>
              Supply: Current inventory + scheduled deliveries<br/>
              Forecast: ML prediction model with 87% accuracy
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-blue-400 mb-1">Key Insights</h4>
            <p className="text-gray-300">
              • Seasonal patterns drive 40% of demand variation<br/>
              • Lead time variability creates supply uncertainty<br/>
              • Forecast accuracy improves procurement efficiency by 23%
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-blue-400 mb-1">Business Impact</h4>
            <p className="text-gray-300">
              Reduces stockouts by 35% and carrying costs by 18% through 
              predictive inventory management and optimized reorder timing.
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
                style={{ height: `${Math.max((item.forecast / maxValue) * 140, 4)}px` }}
                title={`Forecast: ${item.forecast}`}
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
          <span className="text-gray-300">Forecast</span>
        </div>
      </div>
    </div>
  )
}

const PerformanceMetrics: React.FC = () => {
  const [isFlipped, setIsFlipped] = useState(false)
  
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
              Inventory Turnover: COGS ÷ Average Inventory<br/>
              Fill Rate: Orders Fulfilled ÷ Total Orders<br/>
              Carrying Cost: (Storage + Insurance + Capital) ÷ Inventory Value
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-blue-400 mb-1">Industry Benchmarks</h4>
            <p className="text-gray-300">
              Turnover: 3.5-5.2x (Manufacturing avg: 4.1x)<br/>
              Fill Rate: 92-98% (Best-in-class: 96%)<br/>
              Lead Time: 8-20 days (Industry avg: 15.2 days)
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-blue-400 mb-1">Risk Assessment</h4>
            <p className="text-gray-300">
              Stockout Risk based on: Current inventory levels, demand volatility, 
              supplier reliability, and lead time variability. Updated daily.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-blue-400 mb-1">Optimization Opportunities</h4>
            <p className="text-gray-300">
              Improve forecast accuracy by 5% → $1.2M annual savings<br/>
              Reduce lead time by 2 days → 15% inventory reduction
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
          <span className="text-white font-medium">4.2x</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Avg Lead Time</span>
          <span className="text-white font-medium">12.5 days</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Fill Rate</span>
          <span className="text-green-400 font-medium">94.3%</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Carrying Cost</span>
          <span className="text-white font-medium">18.2%</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Stockout Risk</span>
          <span className="text-yellow-400 font-medium">Medium</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Forecast Accuracy</span>
          <span className="text-green-400 font-medium">87.1%</span>
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
  onAddMaterial: (material: Omit<Material, 'originalCurrent' | 'status' | 'usageRate' | 'supplier' | 'lastDelivery'>) => void
  isOpen: boolean
  onToggle: () => void
}

const ControlPanel: React.FC<ControlPanelProps> = ({ 
  materials, 
  onScenarioChange, 
  onMaterialChange, 
  onMaterialUpdate,
  onAddMaterial,
  isOpen, 
  onToggle 
}) => {
  const [showAddForm, setShowAddForm] = useState(false)
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
    if (newMaterial.id && newMaterial.name && newMaterial.unit) {
      onAddMaterial(newMaterial)
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
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="ID (e.g., ST007)"
                    value={newMaterial.id}
                    onChange={(e) => setNewMaterial({...newMaterial, id: e.target.value})}
                    className="bg-gray-600 text-white px-3 py-2 rounded text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Name"
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
                    placeholder="Unit (tons, kg, pieces)"
                    value={newMaterial.unit}
                    onChange={(e) => setNewMaterial({...newMaterial, unit: e.target.value})}
                    className="bg-gray-600 text-white px-3 py-2 rounded text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Current Stock"
                    value={newMaterial.current || ''}
                    onChange={(e) => setNewMaterial({...newMaterial, current: parseInt(e.target.value) || 0})}
                    className="bg-gray-600 text-white px-3 py-2 rounded text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Reorder Point"
                    value={newMaterial.reorder || ''}
                    onChange={(e) => setNewMaterial({...newMaterial, reorder: parseInt(e.target.value) || 0})}
                    className="bg-gray-600 text-white px-3 py-2 rounded text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Max Capacity"
                    value={newMaterial.max || ''}
                    onChange={(e) => setNewMaterial({...newMaterial, max: parseInt(e.target.value) || 0})}
                    className="bg-gray-600 text-white px-3 py-2 rounded text-sm"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Unit Cost ($)"
                    value={newMaterial.cost || ''}
                    onChange={(e) => setNewMaterial({...newMaterial, cost: parseFloat(e.target.value) || 0})}
                    className="bg-gray-600 text-white px-3 py-2 rounded text-sm"
                  />
                </div>
                <button
                  onClick={handleAddMaterial}
                  className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors mt-3"
                >
                  Add Material
                </button>
              </div>
            )}
            
            <div className="space-y-4">
              {materials.map(material => (
                <div key={material.id} className="bg-gray-700 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-white">{material.name}</h4>
                    <span className="text-sm text-gray-300">Current: {material.current.toLocaleString()}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Set current stock"
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

interface InstructionsPanelProps {
  isOpen: boolean
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
          current: Math.floor(material.reorder * 0.3),
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
          current: Math.floor(material.reorder * 2),
        }))
        newDemandData = generateDemandData()
        break
      
      case 'seasonal':
        newMaterials = newMaterials.map(material => ({
          ...material,
          current: Math.floor(material.current * 0.8),
        }))
        newDemandData = newDemandData.map(item => ({
          ...item,
          demand: Math.floor(item.demand * 1.8),
          forecast: Math.floor(item.forecast * 1.6)
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
        const newStatus = (newValue <= material.reorder ? 'critical' : 
                         newValue <= material.reorder * 1.5 ? 'warning' : 'good') as 'critical' | 'warning' | 'good'
        
        return {
          ...material,
          current: newValue,
          status: newStatus
        }
      }
      return material
    }))
    setLastUpdate(new Date())
  }

  const handleAddMaterial = (newMaterialData: Omit<Material, 'originalCurrent' | 'status' | 'usageRate' | 'supplier' | 'lastDelivery'>) => {
    const suppliers = ['AcmeCorp', 'MetalWorks Inc', 'PlastiCo', 'ComponentsPlus', 'WireWorld']
    
    const newMaterial: Material = {
      ...newMaterialData,
      originalCurrent: newMaterialData.current,
      status: (newMaterialData.current <= newMaterialData.reorder ? 'critical' : 
              newMaterialData.current <= newMaterialData.reorder * 1.5 ? 'warning' : 'good') as 'critical' | 'warning' | 'good',
      usageRate: Math.floor(Math.random() * 50) + 10,
      supplier: suppliers[Math.floor(Math.random() * suppliers.length)],
      lastDelivery: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }
    
    setMaterials(prev => [...prev, newMaterial])
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
            <button
              onClick={() => setInstructionsOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Instructions
            </button>
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
          <PerformanceMetrics />
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
    </div>
  )
}

export default Dashboard