import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
    ReactFlow,
    Controls,
    Background,
    addEdge,
    useNodesState,
    useEdgesState,
    MarkerType,
    Panel,
    Handle,
    Position
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react'
import Header from '../components/Layout/Header'
import { useProjects, useProjectDispatch } from '../context/ProjectContext'

// 节点类型配置
const NODE_TYPES_CONFIG = {
    service: { label: '服务', icon: '🔷', color: '#3b82f6' },
    gateway: { label: '网关', icon: '🌐', color: '#8b5cf6' },
    mysql: { label: 'MySQL', icon: '🐬', color: '#06b6d4' },
    postgresql: { label: 'PostgreSQL', icon: '🐘', color: '#0ea5e9' },
    redis: { label: 'Redis', icon: '🔴', color: '#ef4444' },
    kafka: { label: 'Kafka', icon: '📨', color: '#f97316' },
    host: { label: '主机', icon: '🖥️', color: '#6b7280' },
}

// 边类型配置
const EDGE_TYPES = {
    calls: { label: '调用', animated: true },
    uses: { label: '使用', animated: false },
    async: { label: '异步', animated: true, dashed: true },
}

// 自定义节点组件
function ServiceNode({ data, selected }) {
    const nodeType = NODE_TYPES_CONFIG[data.nodeType] || NODE_TYPES_CONFIG.service
    
    return (
        <div 
            className={`topology-node ${selected ? 'selected' : ''}`}
            style={{ borderColor: nodeType.color }}
        >
            <Handle type="target" position={Position.Top} className="node-handle" />
            <Handle type="target" position={Position.Left} className="node-handle" />
            <div className="node-icon">{nodeType.icon}</div>
            <div className="node-content">
                <div className="node-name">{data.label}</div>
                <div className="node-type">{nodeType.label}</div>
            </div>
            <Handle type="source" position={Position.Bottom} className="node-handle" />
            <Handle type="source" position={Position.Right} className="node-handle" />
        </div>
    )
}

const nodeTypes = {
    serviceNode: ServiceNode,
}

export default function TopologyEditor() {
    const navigate = useNavigate()
    const { projectId } = useParams()
    const { currentProject } = useProjects()
    const dispatch = useProjectDispatch()
    
    const [nodes, setNodes, onNodesChange] = useNodesState([])
    const [edges, setEdges, onEdgesChange] = useEdgesState([])
    const [selectedNode, setSelectedNode] = useState(null)
    const [selectedEdge, setSelectedEdge] = useState(null)
    const [showAddPanel, setShowAddPanel] = useState(false)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const reactFlowWrapper = useRef(null)
    const [reactFlowInstance, setReactFlowInstance] = useState(null)

    // 加载项目拓扑
    useEffect(() => {
        if (!projectId) return
        
        fetch(`/api/projects/${projectId}/topology`)
            .then(res => res.json())
            .then(data => {
                const topology = data.topology || { nodes: [], edges: [] }
                // 转换为 ReactFlow 格式
                const flowNodes = (topology.nodes || []).map(n => ({
                    id: n.id,
                    type: 'serviceNode',
                    position: n.position || { x: 100, y: 100 },
                    data: { label: n.name, nodeType: n.type }
                }))
                const flowEdges = (topology.edges || []).map((e, i) => ({
                    id: e.id || `e-${i}`,
                    source: e.from,
                    target: e.to,
                    type: 'smoothstep',
                    animated: EDGE_TYPES[e.type]?.animated ?? true,
                    style: { 
                        stroke: '#6366f1', 
                        strokeWidth: 2,
                        strokeDasharray: EDGE_TYPES[e.type]?.dashed ? '5,5' : undefined
                    },
                    markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
                    data: { edgeType: e.type || 'calls' }
                }))
                setNodes(flowNodes)
                setEdges(flowEdges)
                setLoading(false)
            })
            .catch(err => {
                console.error('Failed to load topology:', err)
                setLoading(false)
            })
    }, [projectId, setNodes, setEdges])

    const onConnect = useCallback((params) => {
        const newEdge = {
            ...params,
            id: `e-${Date.now()}`,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#6366f1', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
            data: { edgeType: 'calls' }
        }
        setEdges((eds) => addEdge(newEdge, eds))
    }, [setEdges])

    const onNodeClick = useCallback((event, node) => {
        setSelectedNode(node)
        setSelectedEdge(null)
    }, [])

    const onEdgeClick = useCallback((event, edge) => {
        setSelectedEdge(edge)
        setSelectedNode(null)
    }, [])

    const onPaneClick = useCallback(() => {
        setSelectedNode(null)
        setSelectedEdge(null)
    }, [])

    const addNode = (nodeType) => {
        const id = `node-${Date.now()}`
        const position = reactFlowInstance?.screenToFlowPosition({
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
        }) || { x: 250, y: 150 }

        const newNode = {
            id,
            type: 'serviceNode',
            position,
            data: { label: `new-${nodeType}`, nodeType }
        }
        setNodes((nds) => [...nds, newNode])
        setShowAddPanel(false)
    }

    const deleteSelected = () => {
        if (selectedNode) {
            setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id))
            setEdges((eds) => eds.filter((e) => 
                e.source !== selectedNode.id && e.target !== selectedNode.id
            ))
            setSelectedNode(null)
        }
        if (selectedEdge) {
            setEdges((eds) => eds.filter((e) => e.id !== selectedEdge.id))
            setSelectedEdge(null)
        }
    }

    const updateNodeData = (key, value) => {
        if (!selectedNode) return
        setNodes((nds) =>
            nds.map((n) =>
                n.id === selectedNode.id
                    ? { ...n, data: { ...n.data, [key]: value } }
                    : n
            )
        )
        setSelectedNode((prev) => ({
            ...prev,
            data: { ...prev.data, [key]: value }
        }))
    }

    const updateEdgeData = (edgeType) => {
        if (!selectedEdge) return
        const config = EDGE_TYPES[edgeType]
        setEdges((eds) =>
            eds.map((e) =>
                e.id === selectedEdge.id
                    ? { 
                        ...e, 
                        animated: config.animated,
                        style: { 
                            ...e.style,
                            strokeDasharray: config.dashed ? '5,5' : undefined 
                        },
                        data: { ...e.data, edgeType } 
                    }
                    : e
            )
        )
    }

    const saveTopology = async () => {
        setSaving(true)
        const topology = {
            nodes: nodes.map(n => ({
                id: n.id,
                type: n.data.nodeType,
                name: n.data.label,
                position: n.position
            })),
            edges: edges.map(e => ({
                id: e.id,
                from: e.source,
                to: e.target,
                type: e.data?.edgeType || 'calls'
            }))
        }
        
        try {
            await fetch(`/api/projects/${projectId}/topology`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(topology)
            })
            // 更新 context 中的项目
            if (currentProject) {
                dispatch({ 
                    type: 'UPDATE_PROJECT', 
                    payload: { ...currentProject, topology } 
                })
            }
            alert('拓扑已保存')
        } catch (err) {
            console.error('Failed to save topology:', err)
            alert('保存失败')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <>
                <Header title="服务拓扑编辑器" />
                <div className="loading">加载中...</div>
            </>
        )
    }

    return (
        <>
            <Header title={`服务拓扑 - ${currentProject?.name || '未知项目'}`} />
            <div className="topology-editor">
                <div className="topology-toolbar">
                    <button className="btn btn-ghost" onClick={() => navigate('/projects')}>
                        <ArrowLeft size={18} />
                        返回
                    </button>
                    <div className="toolbar-actions">
                        <button 
                            className="btn btn-secondary"
                            onClick={() => setShowAddPanel(!showAddPanel)}
                        >
                            <Plus size={18} />
                            添加节点
                        </button>
                        <button 
                            className="btn btn-secondary"
                            onClick={deleteSelected}
                            disabled={!selectedNode && !selectedEdge}
                        >
                            <Trash2 size={18} />
                            删除
                        </button>
                        <button 
                            className="btn btn-primary" 
                            onClick={saveTopology}
                            disabled={saving}
                        >
                            <Save size={18} />
                            {saving ? '保存中...' : '保存'}
                        </button>
                    </div>
                </div>

                <div className="topology-content">
                    <div className="topology-canvas" ref={reactFlowWrapper}>
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            onNodeClick={onNodeClick}
                            onEdgeClick={onEdgeClick}
                            onPaneClick={onPaneClick}
                            onInit={setReactFlowInstance}
                            nodeTypes={nodeTypes}
                            fitView
                            snapToGrid
                            snapGrid={[15, 15]}
                        >
                            <Controls />
                            <Background variant="dots" gap={20} size={1} />
                            
                            {showAddPanel && (
                                <Panel position="top-left" className="add-node-panel">
                                    <div className="panel-title">选择节点类型</div>
                                    <div className="node-type-grid">
                                        {Object.entries(NODE_TYPES_CONFIG).map(([key, config]) => (
                                            <button
                                                key={key}
                                                className="node-type-btn"
                                                onClick={() => addNode(key)}
                                            >
                                                <span className="type-icon">{config.icon}</span>
                                                <span className="type-label">{config.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </Panel>
                            )}
                        </ReactFlow>
                    </div>

                    <div className="topology-properties">
                        {selectedNode ? (
                            <div className="properties-panel">
                                <h3>节点属性</h3>
                                <div className="form-group">
                                    <label className="form-label">名称</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={selectedNode.data.label}
                                        onChange={(e) => updateNodeData('label', e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">类型</label>
                                    <select
                                        className="form-input"
                                        value={selectedNode.data.nodeType}
                                        onChange={(e) => updateNodeData('nodeType', e.target.value)}
                                    >
                                        {Object.entries(NODE_TYPES_CONFIG).map(([key, config]) => (
                                            <option key={key} value={key}>
                                                {config.icon} {config.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        ) : selectedEdge ? (
                            <div className="properties-panel">
                                <h3>连接属性</h3>
                                <div className="form-group">
                                    <label className="form-label">关系类型</label>
                                    <select
                                        className="form-input"
                                        value={selectedEdge.data?.edgeType || 'calls'}
                                        onChange={(e) => updateEdgeData(e.target.value)}
                                    >
                                        {Object.entries(EDGE_TYPES).map(([key, config]) => (
                                            <option key={key} value={key}>
                                                {config.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">从</label>
                                    <input type="text" className="form-input" value={selectedEdge.source} disabled />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">到</label>
                                    <input type="text" className="form-input" value={selectedEdge.target} disabled />
                                </div>
                            </div>
                        ) : (
                            <div className="properties-panel empty">
                                <p>选择节点或连接线查看属性</p>
                                <p className="hint">提示：拖动节点连接点可创建连接</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                .topology-editor {
                    display: flex;
                    flex-direction: column;
                    height: calc(100vh - 64px);
                }
                .topology-toolbar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: var(--space-md) var(--space-lg);
                    border-bottom: 1px solid var(--border-color);
                    background: var(--bg-primary);
                }
                .toolbar-actions {
                    display: flex;
                    gap: var(--space-sm);
                }
                .topology-content {
                    display: flex;
                    flex: 1;
                    overflow: hidden;
                }
                .topology-canvas {
                    flex: 1;
                    height: 100%;
                    background: var(--bg-secondary);
                }
                .topology-properties {
                    width: 260px;
                    border-left: 1px solid var(--border-color);
                    background: var(--bg-primary);
                }
                .properties-panel {
                    padding: var(--space-lg);
                }
                .properties-panel h3 {
                    margin-bottom: var(--space-md);
                    font-size: 1rem;
                }
                .properties-panel.empty {
                    color: var(--text-tertiary);
                    text-align: center;
                    padding-top: 40px;
                }
                .properties-panel .hint {
                    font-size: 0.75rem;
                    margin-top: var(--space-md);
                }
                .topology-node {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 12px 16px;
                    background: var(--bg-primary);
                    border: 2px solid var(--border-color);
                    border-radius: var(--radius-lg);
                    min-width: 140px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                .topology-node.selected {
                    box-shadow: 0 0 0 2px var(--primary);
                }
                .node-icon {
                    font-size: 1.5rem;
                }
                .node-name {
                    font-weight: 500;
                    font-size: 0.875rem;
                }
                .node-type {
                    font-size: 0.75rem;
                    color: var(--text-tertiary);
                }
                .add-node-panel {
                    background: var(--bg-primary);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-lg);
                    padding: var(--space-md);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                }
                .panel-title {
                    font-weight: 500;
                    margin-bottom: var(--space-sm);
                    font-size: 0.875rem;
                }
                .node-type-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 8px;
                }
                .node-type-btn {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 4px;
                    padding: 12px 8px;
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .node-type-btn:hover {
                    background: var(--bg-tertiary);
                    border-color: var(--primary);
                }
                .type-icon {
                    font-size: 1.25rem;
                }
                .type-label {
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                }
                .node-handle {
                    width: 10px;
                    height: 10px;
                    background: var(--primary);
                    border: 2px solid white;
                    opacity: 0;
                    transition: opacity 0.2s;
                }
                .react-flow__node:hover .node-handle {
                    opacity: 1;
                }
                .loading {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 200px;
                    color: var(--text-secondary);
                }
            `}</style>
        </>
    )
}
