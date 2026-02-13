import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Edit, Trash2, Play, Pause, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import Header from '../components/Layout/Header'
import { scheduledTasksApi, useScheduledTaskDispatch } from '../context/ScheduledTaskContext'
import { useAgents } from '../context/AgentContext'

export default function ScheduledTaskDetail() {
    const navigate = useNavigate()
    const { taskId } = useParams()
    const dispatch = useScheduledTaskDispatch()
    const { agents } = useAgents()

    const [task, setTask] = useState(null)
    const [executions, setExecutions] = useState([])
    const [selectedExecution, setSelectedExecution] = useState(null)
    const [loading, setLoading] = useState(true)

    const loadTaskAndExecutions = useCallback(async () => {
        try {
            const [taskData, executionsData] = await Promise.all([
                scheduledTasksApi.get(taskId),
                scheduledTasksApi.getExecutions(taskId, { limit: 50 })
            ])
            setTask(taskData)
            setExecutions(executionsData.executions || [])
            setLoading(false)
        } catch (err) {
            console.error('Failed to load task:', err)
            alert('加载失败: ' + err.message)
            navigate('/scheduled-tasks')
        }
    }, [taskId, navigate])

    useEffect(() => {
        loadTaskAndExecutions()
    }, [loadTaskAndExecutions])

    const handleToggleEnabled = async () => {
        try {
            const updatedTask = task.enabled
                ? await scheduledTasksApi.disable(task.id)
                : await scheduledTasksApi.enable(task.id)
            setTask(updatedTask)
            dispatch({ type: 'UPDATE_TASK', payload: updatedTask })
        } catch (err) {
            console.error('Failed to toggle task:', err)
            alert('操作失败: ' + err.message)
        }
    }

    const handleTrigger = async () => {
        try {
            await scheduledTasksApi.trigger(task.id)
            alert('任务已触发执行')
            setTimeout(loadTaskAndExecutions, 1000)
        } catch (err) {
            console.error('Failed to trigger task:', err)
            alert('触发失败: ' + err.message)
        }
    }

    const handleDelete = async () => {
        if (!confirm(`确定要删除定时任务 "${task.name}" 吗？`)) return

        try {
            await scheduledTasksApi.delete(task.id)
            dispatch({ type: 'DELETE_TASK', payload: task.id })
            navigate('/scheduled-tasks')
        } catch (err) {
            console.error('Failed to delete task:', err)
            alert('删除失败: ' + err.message)
        }
    }

    const handleViewExecution = async (execution) => {
        try {
            const details = await scheduledTasksApi.getExecution(taskId, execution.id)
            setSelectedExecution(details)
        } catch (err) {
            console.error('Failed to load execution:', err)
            alert('加载失败: ' + err.message)
        }
    }

    const formatDateTime = (dateStr) => {
        if (!dateStr) return '-'
        return new Date(dateStr).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        })
    }

    const formatDuration = (startTime, endTime) => {
        if (!startTime || !endTime) return '-'
        const duration = new Date(endTime) - new Date(startTime)
        return `${(duration / 1000).toFixed(1)}s`
    }

    const getStatusIcon = (status) => {
        switch (status) {
            case 'success':
                return <CheckCircle size={16} className="text-success" />
            case 'failed':
                return <XCircle size={16} className="text-danger" />
            case 'running':
                return <Clock size={16} className="text-warning" />
            default:
                return <AlertCircle size={16} className="text-secondary" />
        }
    }

    const getStatusText = (status) => {
        const statusMap = {
            pending: '等待中',
            running: '运行中',
            success: '成功',
            failed: '失败'
        }
        return statusMap[status] || status
    }

    const getAgentName = (agentId) => {
        const agent = agents.find(a => a.id === agentId)
        return agent ? agent.name : agentId
    }

    if (loading) {
        return (
            <>
                <Header title="任务详情" />
                <div className="page-content">
                    <div className="flex items-center justify-center" style={{ minHeight: '400px' }}>
                        加载中...
                    </div>
                </div>
            </>
        )
    }

    return (
        <>
            <Header title="任务详情" />
            <div className="page-content">
                <div className="card mb-md">
                    <div className="flex items-start justify-between mb-md">
                        <div>
                            <h2 className="text-xl font-bold mb-sm">{task.name}</h2>
                            {task.description && (
                                <p className="text-secondary mb-md">{task.description}</p>
                            )}
                        </div>
                        <div className="flex items-center gap-sm">
                            <button
                                className="btn btn-sm btn-secondary"
                                onClick={handleToggleEnabled}
                            >
                                {task.enabled ? <Pause size={16} /> : <Play size={16} />}
                                {task.enabled ? '禁用' : '启用'}
                            </button>
                            <button
                                className="btn btn-sm btn-secondary"
                                onClick={handleTrigger}
                            >
                                <Play size={16} />
                                立即执行
                            </button>
                            <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => navigate(`/scheduled-tasks/${task.id}/edit`)}
                            >
                                <Edit size={16} />
                                编辑
                            </button>
                            <button
                                className="btn btn-sm btn-danger"
                                onClick={handleDelete}
                            >
                                <Trash2 size={16} />
                                删除
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-md">
                        <div>
                            <div className="text-sm text-secondary mb-xs">Agent</div>
                            <div className="font-medium">{getAgentName(task.agentId)}</div>
                        </div>
                        <div>
                            <div className="text-sm text-secondary mb-xs">状态</div>
                            <span className={`badge ${task.enabled ? 'badge-success' : 'badge-secondary'}`}>
                                {task.enabled ? '已启用' : '已禁用'}
                            </span>
                        </div>
                        <div>
                            <div className="text-sm text-secondary mb-xs">Cron 表达式</div>
                            <code className="code-inline">{task.cronExpression}</code>
                        </div>
                        <div>
                            <div className="text-sm text-secondary mb-xs">创建时间</div>
                            <div>{formatDateTime(task.createdAt)}</div>
                        </div>
                        <div>
                            <div className="text-sm text-secondary mb-xs">上次执行</div>
                            <div>{formatDateTime(task.lastExecutedAt)}</div>
                        </div>
                        <div>
                            <div className="text-sm text-secondary mb-xs">下次执行</div>
                            <div>{formatDateTime(task.nextExecutionAt)}</div>
                        </div>
                    </div>

                    <div className="mt-md">
                        <div className="text-sm text-secondary mb-xs">提示词</div>
                        <div className="p-md bg-gray-50 rounded border" style={{ whiteSpace: 'pre-wrap' }}>
                            {task.prompt}
                        </div>
                    </div>
                </div>

                <div className="card">
                    <h3 className="text-lg font-bold mb-md">执行历史</h3>

                    {executions.length === 0 ? (
                        <div className="empty-state">
                            <Clock size={48} className="empty-state-icon" />
                            <div className="empty-state-title">暂无执行记录</div>
                            <div className="empty-state-description">该任务还未执行过</div>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>状态</th>
                                        <th>开始时间</th>
                                        <th>结束时间</th>
                                        <th>耗时</th>
                                        <th>操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {executions.map(execution => (
                                        <tr key={execution.id}>
                                            <td>
                                                <div className="flex items-center gap-sm">
                                                    {getStatusIcon(execution.status)}
                                                    <span>{getStatusText(execution.status)}</span>
                                                </div>
                                            </td>
                                            <td className="text-sm">{formatDateTime(execution.startTime)}</td>
                                            <td className="text-sm">{formatDateTime(execution.endTime)}</td>
                                            <td className="text-sm">
                                                {formatDuration(execution.startTime, execution.endTime)}
                                            </td>
                                            <td>
                                                <button
                                                    className="btn btn-sm btn-ghost"
                                                    onClick={() => handleViewExecution(execution)}
                                                >
                                                    查看详情
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {selectedExecution && (
                    <div className="modal-overlay" onClick={() => setSelectedExecution(null)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>执行详情</h3>
                                <button
                                    className="btn btn-sm btn-ghost"
                                    onClick={() => setSelectedExecution(null)}
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="modal-body">
                                <div className="mb-md">
                                    <div className="text-sm text-secondary mb-xs">状态</div>
                                    <div className="flex items-center gap-sm">
                                        {getStatusIcon(selectedExecution.status)}
                                        <span>{getStatusText(selectedExecution.status)}</span>
                                    </div>
                                </div>
                                <div className="mb-md">
                                    <div className="text-sm text-secondary mb-xs">执行时间</div>
                                    <div>{formatDateTime(selectedExecution.startTime)} - {formatDateTime(selectedExecution.endTime)}</div>
                                    <div className="text-sm">
                                        耗时: {formatDuration(selectedExecution.startTime, selectedExecution.endTime)}
                                    </div>
                                </div>
                                {selectedExecution.error && (
                                    <div className="mb-md">
                                        <div className="text-sm text-secondary mb-xs">错误信息</div>
                                        <div className="p-md bg-red-50 text-danger rounded border border-red-200">
                                            {selectedExecution.error}
                                        </div>
                                    </div>
                                )}
                                {selectedExecution.result && (
                                    <div>
                                        <div className="text-sm text-secondary mb-xs">执行结果</div>
                                        {selectedExecution.result.summary && (
                                            <div className="p-md bg-gray-50 rounded border mb-sm">
                                                <strong>摘要: </strong>{selectedExecution.result.summary}
                                            </div>
                                        )}
                                        {selectedExecution.result.messages && selectedExecution.result.messages.length > 0 && (
                                            <div className="p-md bg-gray-50 rounded border" style={{ maxHeight: '400px', overflow: 'auto' }}>
                                                <strong className="mb-sm block">对话记录:</strong>
                                                {selectedExecution.result.messages.map((msg, idx) => (
                                                    <div key={idx} className="mb-sm pb-sm border-b border-gray-200 last:border-0">
                                                        <div className="text-xs text-secondary mb-xs">
                                                            {msg.role === 'user' ? '用户' : 'Agent'}
                                                        </div>
                                                        <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    )
}
