import React, { useEffect, useRef, useMemo } from 'react'
import { Network, DataSet, Node, Edge } from 'vis-network'
import { BranchStats, ExecutionTreeNode } from '../types'

interface ExecutionTreeProps {
  branchStats: BranchStats
  selectedFile?: string
  onNodeSelect?: (branchId: string) => void
  width?: number
  height?: number
}

export const ExecutionTree: React.FC<ExecutionTreeProps> = ({
  branchStats,
  selectedFile,
  onNodeSelect,
  width = 800,
  height = 600
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const networkRef = useRef<Network | null>(null)

  const treeData = useMemo(() => {
    const filteredStats = Object.values(branchStats).filter(
      branch => !selectedFile || branch.file === selectedFile
    )

    // Group by file and create execution trees
    const fileGroups = filteredStats.reduce((acc, branch) => {
      if (!acc[branch.file]) {
        acc[branch.file] = []
      }
      acc[branch.file].push(branch)
      return acc
    }, {} as Record<string, typeof filteredStats>)

    const nodes: Node[] = []
    const edges: Edge[] = []
    let nodeId = 1

    Object.entries(fileGroups).forEach(([fileName, branches]) => {
      // Sort branches by line number
      const sortedBranches = branches.sort((a, b) => a.line - b.line)
      
      // Create file root node
      const fileNodeId = nodeId++
      const totalExecutions = sortedBranches.reduce((sum, b) => sum + b.hitCount + b.missCount, 0)
      const avgHitRate = totalExecutions > 0 ? 
        sortedBranches.reduce((sum, b) => sum + (b.hitCount / (b.hitCount + b.missCount || 1)), 0) / sortedBranches.length : 0

      nodes.push({
        id: fileNodeId,
        label: fileName.split('/').pop() || fileName,
        title: `File: ${fileName}\nTotal Branches: ${sortedBranches.length}\nAvg Hit Rate: ${(avgHitRate * 100).toFixed(1)}%`,
        color: {
          background: '#e1f5fe',
          border: '#0277bd'
        },
        shape: 'box',
        font: { size: 14, color: '#0277bd' }
      })

      let lastNodeId = fileNodeId

      sortedBranches.forEach((branch, index) => {
        const branchNodeId = nodeId++
        const totalExec = branch.hitCount + branch.missCount
        const hitRate = totalExec > 0 ? branch.hitCount / totalExec : 0
        
        // Determine node characteristics
        const isDeadCode = totalExec === 0
        const isHotPath = hitRate > 0.8 && totalExec > 50
        const isColdPath = hitRate < 0.2 && totalExec > 0

        let nodeColor = '#f5f5f5'
        let borderColor = '#9e9e9e'
        let textColor = '#333'

        if (isDeadCode) {
          nodeColor = '#ffebee'
          borderColor = '#f44336'
          textColor = '#d32f2f'
        } else if (isHotPath) {
          nodeColor = '#e8f5e8'
          borderColor = '#4caf50'
          textColor = '#2e7d32'
        } else if (isColdPath) {
          nodeColor = '#fff3e0'
          borderColor = '#ff9800'
          textColor = '#ef6c00'
        }

        const nodeSize = Math.max(20, Math.min(50, 20 + (totalExec / 10)))

        nodes.push({
          id: branchNodeId,
          label: `${branch.type.toUpperCase()}\nL${branch.line}:${branch.column}`,
          title: `
            Branch: ${branch.condition}
            Type: ${branch.type}
            Location: ${branch.file}:${branch.line}:${branch.column}
            Hit Count: ${branch.hitCount}
            Miss Count: ${branch.missCount}
            Hit Rate: ${(hitRate * 100).toFixed(1)}%
            Status: ${isDeadCode ? 'Dead Code' : isHotPath ? 'Hot Path' : isColdPath ? 'Cold Path' : 'Normal'}
          `,
          color: {
            background: nodeColor,
            border: borderColor
          },
          font: { color: textColor, size: 10 },
          size: nodeSize,
          branchId: branch.branchId // Custom property for selection
        })

        // Connect to previous node (creating a flow)
        edges.push({
          from: lastNodeId,
          to: branchNodeId,
          arrows: 'to',
          color: {
            color: isDeadCode ? '#f44336' : isHotPath ? '#4caf50' : '#9e9e9e',
            opacity: isDeadCode ? 0.3 : isHotPath ? 1 : 0.6
          },
          width: isHotPath ? 3 : isColdPath ? 1 : 2
        })

        lastNodeId = branchNodeId
      })
    })

    return { nodes: new DataSet(nodes), edges: new DataSet(edges) }
  }, [branchStats, selectedFile])

  useEffect(() => {
    if (!containerRef.current) return

    const options = {
      layout: {
        hierarchical: {
          enabled: true,
          direction: 'UD', // Up-Down
          sortMethod: 'directed',
          nodeSpacing: 200,
          levelSeparation: 150
        }
      },
      physics: {
        enabled: false
      },
      edges: {
        smooth: {
          enabled: true,
          type: 'cubicBezier',
          forceDirection: 'vertical',
          roundness: 0.4
        }
      },
      nodes: {
        borderWidth: 2,
        shadow: true,
        chosen: {
          node: function(values: any, id: string, selected: boolean, hovering: boolean) {
            values.shadow = selected || hovering
            values.shadowSize = selected ? 15 : hovering ? 10 : 5
          }
        }
      },
      interaction: {
        hover: true,
        selectConnectedEdges: false
      }
    }

    networkRef.current = new Network(containerRef.current, treeData, options)

    // Handle node selection
    networkRef.current.on('selectNode', (event) => {
      const nodeId = event.nodes[0]
      if (nodeId && onNodeSelect) {
        const node = treeData.nodes.get(nodeId) as any
        if (node?.branchId) {
          onNodeSelect(node.branchId)
        }
      }
    })

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy()
        networkRef.current = null
      }
    }
  }, [treeData, onNodeSelect])

  const stats = useMemo(() => {
    const allBranches = Object.values(branchStats)
    const filtered = selectedFile ? 
      allBranches.filter(b => b.file === selectedFile) : allBranches

    const totalBranches = filtered.length
    const deadBranches = filtered.filter(b => b.hitCount === 0 && b.missCount === 0).length
    const hotBranches = filtered.filter(b => {
      const total = b.hitCount + b.missCount
      return total > 50 && b.hitCount / total > 0.8
    }).length
    const coldBranches = filtered.filter(b => {
      const total = b.hitCount + b.missCount
      return total > 0 && b.hitCount / total < 0.2
    }).length

    return { totalBranches, deadBranches, hotBranches, coldBranches }
  }, [branchStats, selectedFile])

  return (
    <div className="execution-tree">
      <div style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>
          Execution Flow {selectedFile && `- ${selectedFile.split('/').pop()}`}
        </h3>
        <div style={{ display: 'flex', gap: '20px', fontSize: '12px' }}>
          <span>📊 Total: {stats.totalBranches}</span>
          <span style={{ color: '#f44336' }}>💀 Dead: {stats.deadBranches}</span>
          <span style={{ color: '#4caf50' }}>🔥 Hot: {stats.hotBranches}</span>
          <span style={{ color: '#ff9800' }}>❄️ Cold: {stats.coldBranches}</span>
        </div>
      </div>
      
      <div
        ref={containerRef}
        style={{
          width: width,
          height: height,
          border: '1px solid #ccc',
          borderRadius: '4px',
          backgroundColor: '#fafafa'
        }}
      />
      
      <div style={{ marginTop: '10px', fontSize: '11px', color: '#666' }}>
        <div>💡 <strong>Tips:</strong></div>
        <ul style={{ margin: '5px 0', paddingLeft: '15px' }}>
          <li>Node size = execution frequency</li>
          <li>Red nodes = dead code (never executed)</li>
          <li>Green nodes = hot paths (frequently executed)</li>
          <li>Orange nodes = cold paths (rarely executed)</li>
          <li>Click nodes to see details</li>
        </ul>
      </div>
    </div>
  )
}

export default ExecutionTree