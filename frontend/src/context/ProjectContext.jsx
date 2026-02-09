import React, { createContext, useContext, useReducer, useEffect } from 'react'

const ProjectContext = createContext(null)
const ProjectDispatchContext = createContext(null)

function projectReducer(state, action) {
    switch (action.type) {
        case 'SET_PROJECTS':
            return { ...state, projects: action.payload, loading: false }
        case 'SET_CURRENT_PROJECT':
            return { ...state, currentProject: action.payload }
        case 'ADD_PROJECT':
            return { ...state, projects: [...state.projects, action.payload] }
        case 'UPDATE_PROJECT':
            return {
                ...state,
                projects: state.projects.map(p =>
                    p.id === action.payload.id ? action.payload : p
                ),
                currentProject: state.currentProject?.id === action.payload.id 
                    ? action.payload : state.currentProject
            }
        case 'DELETE_PROJECT':
            return {
                ...state,
                projects: state.projects.filter(p => p.id !== action.payload),
                currentProject: state.currentProject?.id === action.payload 
                    ? null : state.currentProject
            }
        default:
            return state
    }
}

export const projectsApi = {
    async list() {
        const res = await fetch('/api/projects')
        if (!res.ok) throw new Error('Failed to fetch projects')
        const data = await res.json()
        return data.projects || []
    },
    async get(id) {
        const res = await fetch(`/api/projects/${id}`)
        if (!res.ok) throw new Error('Failed to fetch project')
        return res.json()
    },
    async create(project) {
        const res = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(project)
        })
        if (!res.ok) throw new Error('Failed to create project')
        return res.json()
    },
    async update(id, project) {
        const res = await fetch(`/api/projects/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(project)
        })
        if (!res.ok) throw new Error('Failed to update project')
        return res.json()
    },
    async delete(id) {
        const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Failed to delete project')
        return res.json()
    }
}

export function ProjectProvider({ children }) {
    const [state, dispatch] = useReducer(projectReducer, {
        projects: [],
        currentProject: null,
        loading: true
    })

    useEffect(() => {
        projectsApi.list()
            .then(projects => {
                dispatch({ type: 'SET_PROJECTS', payload: projects })
                // 自动选择第一个项目
                if (projects.length > 0) {
                    const savedProjectId = localStorage.getItem('currentProjectId')
                    const project = projects.find(p => p.id === savedProjectId) || projects[0]
                    dispatch({ type: 'SET_CURRENT_PROJECT', payload: project })
                }
            })
            .catch(err => {
                console.error('Failed to load projects:', err)
                dispatch({ type: 'SET_PROJECTS', payload: [] })
            })
    }, [])

    // 保存当前项目到 localStorage
    useEffect(() => {
        if (state.currentProject) {
            localStorage.setItem('currentProjectId', state.currentProject.id)
        }
    }, [state.currentProject])

    return (
        <ProjectContext.Provider value={state}>
            <ProjectDispatchContext.Provider value={dispatch}>
                {children}
            </ProjectDispatchContext.Provider>
        </ProjectContext.Provider>
    )
}

export function useProjects() {
    return useContext(ProjectContext)
}

export function useProjectDispatch() {
    return useContext(ProjectDispatchContext)
}
