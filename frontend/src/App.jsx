import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Layout/Sidebar'
import AgentEdit from './pages/AgentEdit'
import AgentChat from './pages/AgentChat'
import SkillList from './pages/SkillList'
import SkillEdit from './pages/SkillEdit'
import ProjectList from './pages/ProjectList'
import ProjectDetail from './pages/ProjectDetail'
import TopologyEditor from './pages/TopologyEditor'
import ScheduledTaskList from './pages/ScheduledTaskList'
import ScheduledTaskEdit from './pages/ScheduledTaskEdit'
import ScheduledTaskDetail from './pages/ScheduledTaskDetail'
import Settings from './pages/Settings'
import { AgentProvider } from './context/AgentContext'
import { ProjectProvider } from './context/ProjectContext'
import { ScheduledTaskProvider } from './context/ScheduledTaskContext'
import { ToastProvider } from './context/ToastContext'

function App() {
  return (
    <ToastProvider>
      <ProjectProvider>
        <AgentProvider>
          <ScheduledTaskProvider>
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
                  <Route path="/scheduled-tasks" element={<ScheduledTaskList />} />
                  <Route path="/scheduled-tasks/new" element={<ScheduledTaskEdit />} />
                  <Route path="/scheduled-tasks/:taskId" element={<ScheduledTaskDetail />} />
                  <Route path="/scheduled-tasks/:taskId/edit" element={<ScheduledTaskEdit />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </main>
            </div>
          </ScheduledTaskProvider>
        </AgentProvider>
      </ProjectProvider>
    </ToastProvider>
  )
}

export default App
