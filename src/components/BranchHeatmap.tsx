import React, { useEffect, useRef, useMemo } from 'react'
import * as d3 from 'd3'
import { BranchStats, HeatmapData } from '../types'

interface BranchHeatmapProps {
  branchStats: BranchStats
  selectedFile?: string
  onBranchClick?: (branchId: string) => void
  width?: number
  height?: number
}

export const BranchHeatmap: React.FC<BranchHeatmapProps> = ({
  branchStats,
  selectedFile,
  onBranchClick,
  width = 800,
  height = 600
}) => {
  const svgRef = useRef<SVGSVGElement>(null)

  const heatmapData = useMemo(() => {
    const fileGroups = Object.values(branchStats).reduce((acc, branch) => {
      if (selectedFile && branch.file !== selectedFile) return acc
      
      if (!acc[branch.file]) {
        acc[branch.file] = []
      }
      
      const totalExecutions = branch.hitCount + branch.missCount
      const hitRate = totalExecutions > 0 ? branch.hitCount / totalExecutions : 0
      
      acc[branch.file].push({
        line: branch.line,
        column: branch.column,
        hitRate,
        condition: branch.condition,
        executionCount: totalExecutions,
        branchId: branch.branchId,
        type: branch.type
      })
      
      return acc
    }, {} as Record<string, Array<HeatmapData['branches'][0] & { branchId: string; type: string }>>)

    return selectedFile ? fileGroups[selectedFile] || [] : Object.values(fileGroups).flat()
  }, [branchStats, selectedFile])

  useEffect(() => {
    if (!svgRef.current || heatmapData.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const margin = { top: 20, right: 90, bottom: 40, left: 60 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // Scales
    const xScale = d3.scaleLinear()
      .domain(d3.extent(heatmapData, d => d.column) as [number, number])
      .range([0, innerWidth])

    const yScale = d3.scaleLinear()
      .domain(d3.extent(heatmapData, d => d.line) as [number, number])
      .range([0, innerHeight])

    const colorScale = d3.scaleSequential(d3.interpolateRdYlGn)
      .domain([0, 1])

    const sizeScale = d3.scaleSqrt()
      .domain([0, d3.max(heatmapData, d => d.executionCount) || 1])
      .range([3, 15])

    // Tooltip
    const tooltip = d3.select('body').append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('padding', '10px')
      .style('background', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('border-radius', '5px')
      .style('pointer-events', 'none')
      .style('font-size', '12px')

    // Branch circles
    g.selectAll('.branch')
      .data(heatmapData)
      .enter().append('circle')
      .attr('class', 'branch')
      .attr('cx', d => xScale(d.column))
      .attr('cy', d => yScale(d.line))
      .attr('r', d => sizeScale(d.executionCount))
      .attr('fill', d => {
        if (d.executionCount === 0) return '#ff4444' // Dead code - red
        return colorScale(d.hitRate)
      })
      .attr('stroke', '#333')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        const hitPercentage = (d.hitRate * 100).toFixed(1)
        const statusText = d.executionCount === 0 ? 'Dead Code' : 
                          d.hitRate > 0.8 ? 'Hot Path' : 
                          d.hitRate < 0.2 ? 'Cold Path' : 'Normal'
        
        tooltip.transition()
          .duration(200)
          .style('opacity', .9)
        tooltip.html(`
          <strong>Branch ${d.type.toUpperCase()}</strong><br/>
          Line: ${d.line}, Column: ${d.column}<br/>
          Condition: ${d.condition}<br/>
          Hit Rate: ${hitPercentage}%<br/>
          Executions: ${d.executionCount}<br/>
          Status: <strong>${statusText}</strong>
        `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px')
          
        d3.select(this).attr('stroke-width', 3)
      })
      .on('mouseout', function() {
        tooltip.transition()
          .duration(500)
          .style('opacity', 0)
          
        d3.select(this).attr('stroke-width', 1)
      })
      .on('click', function(event, d) {
        if (onBranchClick) {
          onBranchClick(d.branchId)
        }
      })

    // Axes
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .append('text')
      .attr('x', innerWidth / 2)
      .attr('y', 35)
      .attr('fill', 'black')
      .style('text-anchor', 'middle')
      .text('Column')

    g.append('g')
      .call(d3.axisLeft(yScale))
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -40)
      .attr('x', -innerHeight / 2)
      .attr('fill', 'black')
      .style('text-anchor', 'middle')
      .text('Line')

    // Legend
    const legend = svg.append('g')
      .attr('transform', `translate(${width - 80}, ${margin.top})`)

    const legendScale = d3.scaleLinear()
      .domain([0, 1])
      .range([100, 0])

    const legendAxis = d3.axisRight(legendScale)
      .tickFormat(d3.format('.0%'))

    legend.append('g')
      .call(legendAxis)

    // Color legend gradient
    const defs = svg.append('defs')
    const linearGradient = defs.append('linearGradient')
      .attr('id', 'legend-gradient')
      .attr('x1', '0%')
      .attr('y1', '100%')
      .attr('x2', '0%')
      .attr('y2', '0%')

    const colorStops = d3.range(0, 1.1, 0.1)
    linearGradient.selectAll('stop')
      .data(colorStops)
      .enter().append('stop')
      .attr('offset', d => (d * 100) + '%')
      .attr('stop-color', d => colorScale(d))

    legend.append('rect')
      .attr('x', -15)
      .attr('y', 0)
      .attr('width', 15)
      .attr('height', 100)
      .style('fill', 'url(#legend-gradient)')

    legend.append('text')
      .attr('x', -20)
      .attr('y', -5)
      .attr('text-anchor', 'end')
      .style('font-size', '12px')
      .text('Hit Rate')

    // Clean up tooltip on unmount
    return () => {
      tooltip.remove()
    }
  }, [heatmapData, width, height, onBranchClick])

  return (
    <div className="branch-heatmap">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ border: '1px solid #ccc', backgroundColor: '#fafafa' }}
      />
      <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
        <span style={{ marginRight: '20px' }}>
          🔴 Dead Code (never executed)
        </span>
        <span style={{ marginRight: '20px' }}>
          🟡 Cold Path (&lt;20% hit rate)
        </span>
        <span>
          🟢 Hot Path (&gt;80% hit rate)
        </span>
      </div>
    </div>
  )
}

export default BranchHeatmap