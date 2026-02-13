import React, { createContext, useContext, useReducer, useEffect } from 'react'

const ScheduledTaskContext = createContext(null)
const ScheduledTaskDispatchContext = createContext(null)

function scheduledTaskReducer(state, action) {
    switch (action.type) {
        case 'SET_TASKS':
            return { ...state, tasks: action.payload, loading: false }
        case 'ADD_TASK':
            return { ...state, tasks: [...state.tasks, action.payload] }
        case 'UPDATE_TASK':
            return {
                ...state,
                tasks: state.tasks.map(t =>
                    t.id === action.payload.id ? action.payload : t
                )
            }
        case 'DELETE_TASK':
            return {
                ...state,
                tasks: state.tasks.filter(t => t.id !== action.payload)
            }
        case 'SET_EXECUTIONS':
            return { ...state, executions: action.payload }
        case 'ADD_EXECUTION':
            return { ...state, executions: [...state.executions, action.payload] }
        default:
            return state
    }
}

// API helper functions for scheduled tasks
export const scheduledTasksApi = {
    async list(params = {}) {
        const query = new URLSearchParams()
        if (params.agentId) query.append('agentId', params.agentId)
        if (params.projectId) query.append('projectId', params.projectId)
        if (params.enabled !== undefined) query.append('enabled', params.enabled)

        const url = `/api/scheduled-tasks${query.toString() ? '?' + query.toString() : ''}`
        const res = await fetch(url)
        if (!res.ok) throw new Error('Failed to fetch scheduled tasks')
        const data = await res.json()
        return data.tasks || []
    },
    async get(id) {
        const res = await fetch(`/api/scheduled-tasks/${id}`)
        if (!res.ok) throw new Error('Failed to fetch scheduled task')
        return res.json()
    },
    async create(task) {
        const res = await fetch('/api/scheduled-tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(task)
        })
        if (!res.ok) {
            const error = await res.json()
            throw new Error(error.detail || 'Failed to create scheduled task')
        }
        const data = await res.json()
        return data.task
    },
    async update(id, task) {
        const res = await fetch(`/api/scheduled-tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(task)
        })
        if (!res.ok) {
            const error = await res.json()
            throw new Error(error.detail || 'Failed to update scheduled task')
        }
        const data = await res.json()
        return data.task
    },
    async delete(id) {
        const res = await fetch(`/api/scheduled-tasks/${id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Failed to delete scheduled task')
        return res.json()
    },
    async enable(id) {
        const res = await fetch(`/api/scheduled-tasks/${id}/enable`, { method: 'POST' })
        if (!res.ok) throw new Error('Failed to enable scheduled task')
        const data = await res.json()
        return data.task
    },
    async disable(id) {
        const res = await fetch(`/api/scheduled-tasks/${id}/disable`, { method: 'POST' })
        if (!res.ok) throw new Error('Failed to disable scheduled task')
        const data = await res.json()
        return data.task
    },
    async trigger(id) {
        const res = await fetch(`/api/scheduled-tasks/${id}/trigger`, { method: 'POST' })
        if (!res.ok) throw new Error('Failed to trigger scheduled task')
        const data = await res.json()
        return data.execution
    },
    async getExecutions(id, params = {}) {
        const query = new URLSearchParams()
        if (params.limit) query.append('limit', params.limit)
        if (params.offset) query.append('offset', params.offset)

        const url = `/api/scheduled-tasks/${id}/executions${query.toString() ? '?' + query.toString() : ''}`
        const res = await fetch(url)
        if (!res.ok) throw new Error('Failed to fetch executions')
        return res.json()
    },
    async getExecution(taskId, executionId) {
        const res = await fetch(`/api/scheduled-tasks/${taskId}/executions/${executionId}`)
        if (!res.ok) throw new Error('Failed to fetch execution')
        return res.json()
    }
}

export function ScheduledTaskProvider({ children }) {
    const [state, dispatch] = useReducer(scheduledTaskReducer, {
        tasks: [],
        executions: [],
        loading: true
    })

    // Load scheduled tasks from backend API
    useEffect(() => {
        scheduledTasksApi.list()
            .then(tasks => {
                dispatch({ type: 'SET_TASKS', payload: tasks })
            })
            .catch(err => {
                console.error('Failed to load scheduled tasks from API:', err)
                dispatch({ type: 'SET_TASKS', payload: [] })
            })
    }, [])

    return (
        <ScheduledTaskContext.Provider value={state}>
            <ScheduledTaskDispatchContext.Provider value={dispatch}>
                {children}
            </ScheduledTaskDispatchContext.Provider>
        </ScheduledTaskContext.Provider>
    )
}

export function useScheduledTasks() {
    return useContext(ScheduledTaskContext)
}

export function useScheduledTaskDispatch() {
    return useContext(ScheduledTaskDispatchContext)
}
