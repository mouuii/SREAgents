import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Clock, Play, Pause, Trash2, Edit, Calendar } from 'lucide-react'
import Header from '../components/Layout/Header'
import { useScheduledTasks, useScheduledTaskDispatch, scheduledTasksApi } from '../context/ScheduledTaskContext'
import { useAgents } from '../context/AgentContext'

export default function ScheduledTaskList() {
    const navigate = useNavigate()
    const { tasks, loading } = useScheduledTasks()
    const { agents } = useAgents()
    const dispatch = useScheduledTaskDispatch()
    const [searchTerm, setSearchTerm] = useState('')
    const [filterEnabled, setFilterEnabled] = useState('all')

    const filteredTasks = tasks.filter(task => {
        const matchesSearch = task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            task.description.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesFilter = filterEnabled === 'all' ||
            (filterEnabled === 'enabled' && task.enabled) ||
            (filterEnabled === 'disabled' && !task.enabled)
        return matchesSearch && matchesFilter
    })

    const getAgentName = (agentId) => {
        const agent = agents.find(a => a.id === agentId)
        return agent ? agent.name : agentId
    }

    const handleToggleEnabled = async (task) => {
        try {
            const updatedTask = task.enabled
                ? await scheduledTasksApi.disable(task.id)
                : await scheduledTasksApi.enable(task.id)
            dispatch({ type: 'UPDATE_TASK', payload: updatedTask })
        } catch (err) {
            console.error('Failed to toggle task:', err)
            alert('操作失败: ' + err.message)
        }
    }

    const handleTrigger = async (task) => {
        try {
            await scheduledTasksApi.trigger(task.id)
            alert('任务已触发执行')
        } catch (err) {
            console.error('Failed to trigger task:', err)
            alert('触发失败: ' + err.message)
        }
    }

    const handleDelete = async (task) => {
        if (!confirm(`确定要删除定时任务 "${task.name}" 吗？`)) return

        try {
            await scheduledTasksApi.delete(task.id)
            dispatch({ type: 'DELETE_TASK', payload: task.id })
        } catch (err) {
            console.error('Failed to delete task:', err)
            alert('删除失败: ' + err.message)
        }
    }

    const formatDateTime = (dateStr) => {
        if (!dateStr) return '-'
        return new Date(dateStr).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    if (loading) {
        return (
            <>
                <Header title="定时任务" />
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
            <Header title="定时任务" />
            <div className="page-content">
                <div className="page-header">
                    <h2 className="page-title">定时任务列表</h2>
                    <button className="btn btn-primary" onClick={() => navigate('/scheduled-tasks/new')}>
                        <Plus size={18} />
                        创建定时任务
                    </button>
                </div>

                <div className="mb-md flex items-center gap-md">
                    <input
                        type="text"
                        className="form-input"
                        placeholder="搜索任务..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ maxWidth: '300px' }}
                    />
                    <select
                        className="form-input"
                        value={filterEnabled}
                        onChange={(e) => setFilterEnabled(e.target.value)}
                        style={{ maxWidth: '150px' }}
                    >
                        <option value="all">全部状态</option>
                        <option value="enabled">已启用</option>
                        <option value="disabled">已禁用</option>
                    </select>
                </div>

                {filteredTasks.length === 0 ? (
                    <div className="empty-state">
                        <Clock size={48} className="empty-state-icon" />
                        <div className="empty-state-title">没有找到定时任务</div>
                        <div className="empty-state-description">创建定时任务来自动执行运维操作</div>
                        <button className="btn btn-primary" onClick={() => navigate('/scheduled-tasks/new')}>
                            <Plus size={18} />
                            创建定时任务
                        </button>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ minWidth: '200px' }}>任务名称</th>
                                    <th style={{ minWidth: '120px' }}>Agent</th>
                                    <th style={{ minWidth: '120px' }}>Cron 表达式</th>
                                    <th style={{ minWidth: '80px' }}>状态</th>
                                    <th style={{ minWidth: '150px' }}>上次执行</th>
                                    <th style={{ minWidth: '150px' }}>下次执行</th>
                                    <th style={{ minWidth: '200px' }}>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTasks.map(task => (
                                    <tr key={task.id}>
                                        <td>
                                            <div className="font-medium">{task.name}</div>
                                            {task.description && (
                                                <div className="text-sm text-secondary">{task.description}</div>
                                            )}
                                        </td>
                                        <td>{getAgentName(task.agentId)}</td>
                                        <td>
                                            <code className="code-inline">{task.cronExpression}</code>
                                        </td>
                                        <td>
                                            <span className={`badge ${task.enabled ? 'badge-success' : 'badge-secondary'}`}>
                                                {task.enabled ? '已启用' : '已禁用'}
                                            </span>
                                        </td>
                                        <td className="text-sm">{formatDateTime(task.lastExecutedAt)}</td>
                                        <td className="text-sm">{formatDateTime(task.nextExecutionAt)}</td>
                                        <td>
                                            <div className="flex items-center gap-sm">
                                                <button
                                                    className="btn btn-sm btn-ghost"
                                                    onClick={() => handleToggleEnabled(task)}
                                                    title={task.enabled ? '禁用' : '启用'}
                                                >
                                                    {task.enabled ? <Pause size={14} /> : <Play size={14} />}
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-ghost"
                                                    onClick={() => handleTrigger(task)}
                                                    title="立即执行"
                                                >
                                                    <Play size={14} />
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-ghost"
                                                    onClick={() => navigate(`/scheduled-tasks/${task.id}`)}
                                                    title="查看详情"
                                                >
                                                    <Calendar size={14} />
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-ghost"
                                                    onClick={() => navigate(`/scheduled-tasks/${task.id}/edit`)}
                                                    title="编辑"
                                                >
                                                    <Edit size={14} />
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-ghost text-danger"
                                                    onClick={() => handleDelete(task)}
                                                    title="删除"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    )
}
