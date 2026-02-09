import { useState, useRef } from 'react'
import { X, FileText } from 'lucide-react'

export default function UploadSkillModal({ isOpen, onClose, onUpload }) {
    const [isDragging, setIsDragging] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState('')
    const fileInputRef = useRef(null)
    const folderInputRef = useRef(null)

    if (!isOpen) return null

    const handleDragOver = (e) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = (e) => {
        e.preventDefault()
        setIsDragging(false)
    }

    const handleDrop = async (e) => {
        e.preventDefault()
        setIsDragging(false)
        setError('')

        const items = e.dataTransfer.items
        if (!items || items.length === 0) return

        // 检查是否是文件夹
        const item = items[0]
        if (item.webkitGetAsEntry) {
            const entry = item.webkitGetAsEntry()
            if (entry && entry.isDirectory) {
                await handleFolderEntry(entry)
                return
            }
        }

        // 处理文件（.zip 或 .md）
        const files = e.dataTransfer.files
        if (files.length > 0) {
            await handleFiles(files)
        }
    }

    const handleFolderEntry = async (dirEntry) => {
        setUploading(true)
        try {
            const files = await readDirectoryEntry(dirEntry)
            const skillMd = files.find(f => f.name.toUpperCase() === 'SKILL.MD')
            
            if (!skillMd) {
                setError('文件夹中没有找到 SKILL.md 文件')
                return
            }

            // 创建 FormData，包含所有文件
            const formData = new FormData()
            formData.append('type', 'folder')
            formData.append('folderName', dirEntry.name)
            
            for (const file of files) {
                formData.append('files', file, file.webkitRelativePath || file.name)
            }

            await uploadFormData(formData)
        } catch (err) {
            setError(err.message || '上传失败')
        } finally {
            setUploading(false)
        }
    }

    const readDirectoryEntry = (dirEntry) => {
        return new Promise((resolve, reject) => {
            const files = []
            const reader = dirEntry.createReader()
            
            const readEntries = () => {
                reader.readEntries(async (entries) => {
                    if (entries.length === 0) {
                        resolve(files)
                        return
                    }
                    
                    for (const entry of entries) {
                        if (entry.isFile) {
                            const file = await getFileFromEntry(entry)
                            files.push(file)
                        }
                    }
                    readEntries()
                }, reject)
            }
            readEntries()
        })
    }

    const getFileFromEntry = (fileEntry) => {
        return new Promise((resolve, reject) => {
            fileEntry.file(resolve, reject)
        })
    }

    const handleFiles = async (files) => {
        const file = files[0]
        const ext = file.name.split('.').pop().toLowerCase()

        if (!['zip', 'md'].includes(ext)) {
            setError('支持 .zip 或 .md 文件')
            return
        }

        setUploading(true)
        setError('')

        try {
            const formData = new FormData()
            formData.append('type', 'file')
            formData.append('file', file)
            await uploadFormData(formData)
        } catch (err) {
            setError(err.message || '上传失败')
        } finally {
            setUploading(false)
        }
    }

    const uploadFormData = async (formData) => {
        const response = await fetch('/api/skills/upload', {
            method: 'POST',
            body: formData
        })

        const data = await response.json()

        if (!response.ok) {
            throw new Error(data.detail || '上传失败')
        }

        onUpload(data.skills)
        onClose()
    }

    const handleFileSelect = (e) => {
        if (e.target.files?.length > 0) {
            handleFiles(e.target.files)
        }
    }

    const handleFolderSelect = async (e) => {
        const files = Array.from(e.target.files || [])
        if (files.length === 0) return

        const skillMd = files.find(f => f.name.toUpperCase() === 'SKILL.MD')
        if (!skillMd) {
            setError('文件夹中没有找到 SKILL.md 文件')
            return
        }

        setUploading(true)
        setError('')

        try {
            const formData = new FormData()
            formData.append('type', 'folder')
            
            // 从路径中提取文件夹名
            const folderName = files[0].webkitRelativePath.split('/')[0]
            formData.append('folderName', folderName)

            for (const file of files) {
                formData.append('files', file, file.webkitRelativePath)
            }

            await uploadFormData(formData)
        } catch (err) {
            setError(err.message || '上传失败')
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                <div className="modal-header">
                    <h3 className="modal-title">上传技能</h3>
                    <button className="btn btn-ghost" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body">
                    {/* Drop Zone */}
                    <div
                        className={`upload-dropzone ${isDragging ? 'dragging' : ''}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className="upload-icon">
                            <FileText size={32} strokeWidth={1.5} />
                        </div>
                        <p className="upload-text">
                            {uploading ? '上传中...' : '拖拽文件或文件夹上传'}
                        </p>
                    </div>

                    {/* Hidden inputs */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".zip,.md"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                    />
                    <input
                        ref={folderInputRef}
                        type="file"
                        webkitdirectory=""
                        directory=""
                        onChange={handleFolderSelect}
                        style={{ display: 'none' }}
                    />

                    {/* Error */}
                    {error && (
                        <div className="upload-error">{error}</div>
                    )}

                    {/* Requirements */}
                    <div className="upload-requirements">
                        <p className="requirements-title">支持的格式</p>
                        <ul>
                            <li>单个 SKILL.md 文件</li>
                            <li>.zip 压缩包（根目录包含 SKILL.md）</li>
                            <li>文件夹 / .skill 包（包含 SKILL.md）</li>
                        </ul>
                    </div>
                </div>
            </div>

            <style>{`
                .upload-dropzone {
                    border: 2px dashed var(--border-color);
                    border-radius: var(--radius-lg);
                    padding: 48px 24px;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.2s;
                    background: var(--bg-secondary);
                }
                .upload-dropzone:hover,
                .upload-dropzone.dragging {
                    border-color: var(--primary);
                    background: var(--bg-tertiary);
                }
                .upload-icon {
                    color: var(--text-tertiary);
                    margin-bottom: 12px;
                }
                .upload-text {
                    color: var(--text-secondary);
                    margin: 0;
                }
                .upload-error {
                    color: var(--error);
                    font-size: 0.875rem;
                    margin-top: 12px;
                    padding: 8px 12px;
                    background: rgba(239, 68, 68, 0.1);
                    border-radius: var(--radius-md);
                }
                .upload-requirements {
                    margin-top: 20px;
                    padding-top: 16px;
                    border-top: 1px solid var(--border-color);
                }
                .requirements-title {
                    font-weight: 500;
                    margin-bottom: 8px;
                    color: var(--text-primary);
                }
                .upload-requirements ul {
                    margin: 0;
                    padding-left: 20px;
                    color: var(--text-secondary);
                    font-size: 0.875rem;
                }
                .upload-requirements li {
                    margin-bottom: 4px;
                }
            `}</style>
        </div>
    )
}
