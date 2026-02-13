import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Layout/Sidebar'
import AgentEdit from './pages/AgentEdit'
import AgentChat from './pages/AgentChat'
import SkillList from './pages/SkillList'
import SkillEdit from './pages/SkillEdit'
import ProjectList from './pages/ProjectList'
import ProjectDetail from './pages/ProjectDetail'
import TopologyEditor from './pages/TopologyEditor'
import Settings from './pages/Settings'
import { AgentProvider } from './context/AgentContext'
import { ProjectProvider } from './context/ProjectContext'
import { ToastProvider } from './context/ToastContext'

function App() {
  return (
    <ToastProvider>
      <ProjectProvider>
        <AgentProvider>
          <div className="app-layout">
            <Sidebar />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<ProjectList />} />
                <Route path="/projects" element={<ProjectList />} />
                <Route path="/projects/:projectId" element={<ProjectDetail />} />
                <Route path="/projects/:projectId/topology" element={<TopologyEditor />} />
                <Route path="/projects/:projectId/agents/new" element={<AgentEdit />} />
                <Route path="/agents/:id" element={<AgentEdit />} />
                <Route path="/agents/:id/chat" element={<AgentChat />} />
                <Route path="/skills" element={<SkillList />} />
                <Route path="/skills/new" element={<SkillEdit />} />
                <Route path="/skills/:id" element={<SkillEdit />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </main>
          </div>
        </AgentProvider>
      </ProjectProvider>
    </ToastProvider>
  )
}

export default App
