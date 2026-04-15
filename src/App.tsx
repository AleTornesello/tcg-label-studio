import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { TEMPLATES, type Template, LocalStorageKeys } from "./constants";
import {
  Plus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Type,
  MousePointer2,
  Printer,
  Download,
  Loader2,
  Menu,
  X,
  FolderOpen,
  ChevronRight,
  FileUp,
  FileDown,
} from "lucide-react";

interface CellData {
  text: string;
  textAlign: 'left' | 'center' | 'right';
  styles: {
    bold: boolean;
    italic: boolean;
    underline: boolean;
  };
}

interface Project {
  id: string;
  name: string;
  pages: string[];
  templateId: string;
  cellsData: Record<number, Record<number, CellData>>;
  lastModified: number;
}

export default function App() {
  const [pages, setPages] = useState(["Page 1"]);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [projectName, setProjectName] = useState("New project");
  const [projectId, setProjectId] = useState<string>(() => Date.now().toString());
  const [savedProjects, setSavedProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem(LocalStorageKeys.Projects);
    return saved ? JSON.parse(saved) : [];
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template>(TEMPLATES[0]);
  const [selectedCellIndex, setSelectedCellIndex] = useState<number | null>(null);
  const [cellsData, setCellsData] = useState<Record<number, Record<number, CellData>>>({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmMode, setConfirmMode] = useState<'template' | 'new_project'>('template');
  const [pendingTemplate, setPendingTemplate] = useState<Template | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const printContainerRef = useRef<HTMLDivElement>(null);

  // Persistence Logic
  const saveProject = () => {
    if (!projectId) return;
    const newProject: Project = {
      id: projectId,
      name: projectName,
      pages,
      templateId: selectedTemplate.id,
      cellsData,
      lastModified: Date.now()
    };

    setSavedProjects(prev => {
      const filtered = prev.filter(p => p.id !== projectId);
      const updated = [newProject, ...filtered];
      localStorage.setItem(LocalStorageKeys.Projects, JSON.stringify(updated));
      return updated;
    });
    localStorage.setItem(LocalStorageKeys.LastOpened, projectId);
  };

  // Auto-save effect
  useEffect(() => {
    const timer = setTimeout(() => {
      saveProject();
    }, 200);
    return () => clearTimeout(timer);
  }, [projectId, projectName, pages, selectedTemplate, cellsData]);

  const loadProject = (project: Project) => {
    setProjectId(project.id);
    setProjectName(project.name);
    setPages(project.pages);
    setActivePageIndex(0);
    const template = TEMPLATES.find(t => t.id === project.templateId) || TEMPLATES[0];
    setSelectedTemplate(template);
    setCellsData(project.cellsData);
    setSelectedCellIndex(null);
    setIsMenuOpen(false);
    localStorage.setItem(LocalStorageKeys.LastOpened, project.id);
  };

  const deleteProject = (id: string, e: any) => {
    e.stopPropagation();
    setSavedProjects(prev => {
      const updated = prev.filter(p => p.id !== id);
      localStorage.setItem(LocalStorageKeys.Projects, JSON.stringify(updated));
      return updated;
    });
  };

  const exportProject = () => {
    const project: Project = {
      id: projectId,
      name: projectName,
      pages,
      templateId: selectedTemplate.id,
      cellsData,
      lastModified: Date.now()
    };
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    saveAs(blob, `${projectName.replace(/\s+/g, '_').toLowerCase()}_project.json`);
    setIsMenuOpen(false);
  };

  const importProject = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const project: Project = JSON.parse(event.target?.result as string);
        // Generate a new ID to avoid conflicts but keep the data
        const importedProject = {
          ...project,
          id: Date.now().toString(),
          lastModified: Date.now()
        };
        loadProject(importedProject);
        // Also save it to local storage immediately
        setSavedProjects(prev => {
          const updated = [importedProject, ...prev];
          localStorage.setItem(LocalStorageKeys.Projects, JSON.stringify(updated));
          return updated;
        });
        setIsMenuOpen(false);
      } catch (error) {
        console.error("Failed to import project:", error);
        alert("Invalid project file");
      }
    };
    reader.readAsText(file);
  };

  const handleTemplateChange = (template: Template) => {
    if (template.id === selectedTemplate.id) return;

    const hasLabels = Object.values(cellsData).some(page => 
      Object.values(page).some(cell => cell.text.trim() !== "")
    );

    if (hasLabels) {
      setPendingTemplate(template);
      setConfirmMode('template');
      setShowConfirmModal(true);
    } else {
      setSelectedTemplate(template);
      setCellsData({});
      setSelectedCellIndex(null);
    }
  };

  const handleNewProject = () => {
    resetToNewProject();
  };

  const resetToNewProject = () => {
    const newId = Date.now().toString();
    setPages(["Page 1"]);
    setActivePageIndex(0);
    setProjectName("New project");
    setProjectId(newId);
    setSelectedTemplate(TEMPLATES[0]);
    setSelectedCellIndex(null);
    setCellsData({});
    setIsMenuOpen(false);
    localStorage.setItem(LocalStorageKeys.LastOpened, newId);
  };

  // Initial Load
  useEffect(() => {
    const lastOpenedId = localStorage.getItem(LocalStorageKeys.LastOpened);
    if (lastOpenedId) {
      const project = savedProjects.find(p => p.id === lastOpenedId);
      if (project) {
        loadProject(project);
      } else {
        localStorage.setItem(LocalStorageKeys.LastOpened, projectId);
      }
    } else {
      localStorage.setItem(LocalStorageKeys.LastOpened, projectId);
    }
  }, []);

  const handleConfirmAction = () => {
    if (confirmMode === 'template' && pendingTemplate) {
      setSelectedTemplate(pendingTemplate);
      setCellsData({});
      setSelectedCellIndex(null);
    } else if (confirmMode === 'new_project') {
      resetToNewProject();
    }
    setShowConfirmModal(false);
    setPendingTemplate(null);
  };

  const exportAllAsPng = async () => {
    if (!printContainerRef.current) return;
    setIsExporting(true);

    try {
      const zip = new JSZip();
      const pagesElements = printContainerRef.current.querySelectorAll('.print-page');
      
      // Temporarily show the container for capturing
      const container = printContainerRef.current;
      container.style.display = 'block';
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';

      for (let i = 0; i < pagesElements.length; i++) {
        const element = pagesElements[i] as HTMLElement;
        const dataUrl = await toPng(element, {
          pixelRatio: 2, // Higher quality
          backgroundColor: '#ffffff',
        });
        const base64Data = dataUrl.split(',')[1];
        zip.file(`page-${i + 1}.png`, base64Data, { base64: true });
      }

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'tcg-labels.zip');
      
      // Restore container state
      container.style.display = 'none';
      container.style.position = '';
      container.style.left = '';
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const addPage = () => {
    const newPageNumber = pages.length + 1;
    setPages([...pages, `Page ${newPageNumber}`]);
    setActivePageIndex(pages.length);
  };

  const updatePageTitle = (title: string) => {
    const newPages = [...pages];
    newPages[activePageIndex] = title.slice(0, 20);
    setPages(newPages);
  };

  const updateCellData = (index: number, data: Partial<CellData>) => {
    setCellsData(prev => {
      const pageData = prev[activePageIndex] || {};
      return {
        ...prev,
        [activePageIndex]: {
          ...pageData,
          [index]: {
            ...(pageData[index] || {
              text: "",
              textAlign: 'center',
              styles: { bold: false, italic: false, underline: false }
            }),
            ...data
          }
        }
      };
    });
  };

  const toggleStyle = (index: number, style: keyof CellData['styles']) => {
    const pageData = cellsData[activePageIndex] || {};
    const currentData = pageData[index] || {
      text: "",
      textAlign: 'center',
      styles: { bold: false, italic: false, underline: false }
    };
    updateCellData(index, {
      styles: {
        ...currentData.styles,
        [style]: !currentData.styles[style]
      }
    });
  };

  const currentCell = selectedCellIndex !== null ? (cellsData[activePageIndex]?.[selectedCellIndex] || {
    text: "",
    textAlign: 'center',
    styles: { bold: false, italic: false, underline: false }
  }) : null;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Toolbar / Header */}
      <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-4 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="Logo" className="h-7" referrerPolicy="no-referrer" />
          <h1 className="font-semibold text-sm tracking-tight">TCG Label Studio</h1>
        </div>
      </header>

      {/* Tiered Menu Overlay Placeholder */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[15] top-[104px]">
          <div 
            className="absolute inset-0 bg-black/5 backdrop-blur-[2px]" 
            onClick={() => {
              setIsMenuOpen(false);
              setIsSubmenuOpen(false);
            }}
          />
          <div className="absolute left-4 top-2 flex gap-2 items-start">
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="w-64 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col"
            >
              <div className="py-2">
                <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">File</div>
                <button 
                  onClick={handleNewProject}
                  className="w-full px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                >
                  <Plus className="w-4 h-4" /> New Project
                </button>
                <button 
                  onClick={() => setIsSubmenuOpen(!isSubmenuOpen)}
                  className={`w-full px-4 py-2 text-xs flex items-center justify-between transition-colors ${
                    isSubmenuOpen ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FolderOpen className="w-4 h-4" /> Open Project
                  </div>
                  <ChevronRight className={`w-3 h-3 transition-transform ${isSubmenuOpen ? 'rotate-90' : ''}`} />
                </button>

                <div className="h-px bg-gray-100 my-2" />
                <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Share</div>
                
                <button 
                  onClick={exportProject}
                  className="w-full px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                >
                  <FileDown className="w-4 h-4" /> Export Project (.json)
                </button>

                <label className="w-full px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors cursor-pointer">
                  <FileUp className="w-4 h-4" /> Import Project (.json)
                  <input 
                    type="file" 
                    accept=".json" 
                    onChange={importProject} 
                    className="hidden" 
                  />
                </label>
              </div>
            </motion.div>

            {isSubmenuOpen && (
              <motion.div
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="w-72 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[calc(100vh-120px)]"
              >
                <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
                  <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Recent Projects</div>
                  <div className="space-y-1 px-2">
                    {savedProjects
                      .sort((a, b) => b.lastModified - a.lastModified)
                      .slice(0, 10)
                      .map(project => (
                        <div 
                          key={project.id}
                          onClick={() => {
                            loadProject(project);
                            setIsSubmenuOpen(false);
                          }}
                          className={`group w-full px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-all cursor-pointer ${
                            projectId === project.id ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold truncate">{project.name}</span>
                            <span className="text-[9px] opacity-60">
                              {new Date(project.lastModified).toLocaleDateString()}
                            </span>
                          </div>
                          <button 
                            onClick={(e) => deleteProject(project.id, e)}
                            className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 rounded transition-all"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    {savedProjects.length === 0 && (
                      <div className="px-3 py-8 text-center">
                        <p className="text-[10px] text-gray-400">No saved projects found</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* Secondary Toolbar (Contextual) */}
      <div className="h-12 border-b border-gray-200 bg-white flex items-center justify-between px-4 shrink-0 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 border-r border-gray-100 pr-4 mr-2">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
            >
              {isMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value.slice(0, 30))}
              maxLength={30}
              className="bg-transparent border-none focus:ring-0 font-bold text-xs tracking-tight text-gray-900 w-56 p-0 placeholder:text-gray-400"
              placeholder="Project Name"
            />
          </div>

          <div className="flex items-center gap-2">
            {pages.map((page, index) => (
            <button
              key={index}
              onClick={() => {
                setActivePageIndex(index);
                setSelectedCellIndex(null);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all whitespace-nowrap ${activePageIndex === index
                  ? "bg-black text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
            >
              {page}
            </button>
          ))}
          <button
            onClick={addPage}
            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-full transition-colors shrink-0"
            title="Add new page"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-full transition-all shrink-0"
            title="Print all pages"
          >
            <Printer className="w-4 h-4" />
            Print All
          </button>

          <button
            onClick={exportAllAsPng}
            disabled={isExporting}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-emerald-600 hover:bg-emerald-50 rounded-full transition-all shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export all pages as PNG"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {isExporting ? 'Exporting...' : 'Export PNG'}
          </button>
        </div>
      </div>

      {/* Workspace Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Content Container */}
        <main 
          className="flex-1 overflow-auto relative bg-[#F3F4F6] p-12 flex flex-col items-center custom-scrollbar"
          onClick={() => setSelectedCellIndex(null)}
        >
          {/* Subtle Grid Background */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage: `radial-gradient(#000 1px, transparent 1px)`,
              backgroundSize: '24px 24px'
            }}
          />

          {/* A4 Page Card */}
          <motion.div
            key={selectedTemplate.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="bg-white shadow-[0_0_50px_rgba(0,0,0,0.1)] border border-gray-200 w-[595px] aspect-[210/297] relative shrink-0 z-10 mb-12 overflow-hidden group"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Safe Area Indicator (Visual Only) */}
            <div 
              className="absolute inset-0 border border-blue-100/50 pointer-events-none z-0"
              style={{ margin: `${10 * (595 / 210)}px` }}
            />

            {/* Grid Rendering */}
            <div 
              className="absolute inset-0 flex items-center justify-center"
              style={{ padding: `${10 * (595 / 210)}px` }}
            >
              <div 
                className="grid bg-white"
                style={{
                  gridTemplateColumns: `repeat(${Math.floor(190 / selectedTemplate.width)}, min-content)`,
                  gap: '0px'
                }}
              >
                {Array.from({ 
                  length: Math.floor(190 / selectedTemplate.width) * 
                          Math.floor(277 / selectedTemplate.parts.reduce((acc, p) => acc + p.height, 0)) 
                }).map((_, i) => {
                  const cellData = cellsData[activePageIndex]?.[i];
                  const totalHeight = selectedTemplate.parts.reduce((acc, p) => acc + p.height, 0);
                  
                  return (
                    <div 
                      key={i}
                      onClick={() => setSelectedCellIndex(i)}
                      className={`border border-gray-200 relative group/cell transition-all cursor-pointer overflow-hidden ${
                        selectedCellIndex === i ? 'ring-2 ring-blue-500 ring-inset z-20 bg-blue-50/10' : 'hover:bg-blue-50/30'
                      }`}
                      style={{
                        width: `${selectedTemplate.width * (595 / 210)}px`,
                        height: `${totalHeight * (595 / 210)}px`
                      }}
                    >
                      {/* Parts Rendering */}
                      <div className="flex flex-col h-full">
                        {selectedTemplate.parts.map((part, pIdx) => (
                          <div 
                            key={pIdx}
                            className={`relative border-b border-gray-100 last:border-b-0 ${part.isWritable ? '' : 'bg-gray-50/30'}`}
                            style={{ height: `${(part.height / totalHeight) * 100}%` }}
                          >
                            {/* Fold line indicator if not the last part */}
                            {pIdx < selectedTemplate.parts.length - 1 && (
                              <div className="absolute bottom-0 left-0 right-0 border-b border-dotted border-gray-300 z-10" />
                            )}

                            {part.isWritable && (
                              <div 
                                className={`absolute inset-0 p-1 flex flex-col justify-center pointer-events-none ${
                                  cellData?.textAlign === 'left' ? 'items-start text-left' :
                                  cellData?.textAlign === 'right' ? 'items-end text-right' :
                                  'items-center text-center'
                                }`}
                              >
                                <span 
                                  className={`text-[10px] leading-tight break-words whitespace-pre-line w-full px-1 ${
                                    cellData?.styles.bold ? 'font-bold' : 'font-normal'
                                  } ${
                                    cellData?.styles.italic ? 'italic' : ''
                                  } ${
                                    cellData?.styles.underline ? 'underline' : ''
                                  }`}
                                >
                                  {cellData?.text || ""}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </main>

        {/* Right Sidebar */}
        <aside className="w-72 border-l border-gray-200 bg-white flex flex-col shrink-0 z-20">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">Properties</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
            {selectedCellIndex !== null && currentCell ? (
              <div key={selectedCellIndex} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cell Properties</h3>
                  <button 
                    onClick={() => setSelectedCellIndex(null)}
                    className="text-[10px] font-bold text-blue-500 uppercase tracking-widest hover:text-blue-600 transition-colors"
                  >
                    Done
                  </button>
                </div>
                {/* Text Input */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight flex items-center gap-2">
                    <Type className="w-3 h-3" />
                    Label Text
                  </label>
                  <textarea
                    autoFocus
                    value={currentCell.text}
                    onChange={(e) => updateCellData(selectedCellIndex, { text: e.target.value.split('\n').slice(0, 2).join('\n') })}
                    placeholder="Enter text (max 2 lines)"
                    rows={2}
                    className="w-full p-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 resize-none transition-all"
                  />
                  <div className="text-[9px] text-gray-400 text-right">
                    {currentCell.text.split('\n').length}/2 lines
                  </div>
                </div>

                {/* Alignment */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Alignment</label>
                  <div className="flex bg-gray-100 p-1 rounded-lg">
                    {(['left', 'center', 'right'] as const).map((align) => (
                      <button
                        key={align}
                        onClick={() => updateCellData(selectedCellIndex, { textAlign: align })}
                        className={`flex-1 flex justify-center py-1.5 rounded-md transition-all ${
                          currentCell.textAlign === align ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        {align === 'left' && <AlignLeft className="w-4 h-4" />}
                        {align === 'center' && <AlignCenter className="w-4 h-4" />}
                        {align === 'right' && <AlignRight className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Text Styles */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Text Style</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleStyle(selectedCellIndex, 'bold')}
                      className={`flex-1 flex justify-center py-2 border rounded-lg transition-all ${
                        currentCell.styles.bold ? 'bg-black border-black text-white shadow-md' : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                      }`}
                      title="Bold"
                    >
                      <Bold className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleStyle(selectedCellIndex, 'italic')}
                      className={`flex-1 flex justify-center py-2 border rounded-lg transition-all ${
                        currentCell.styles.italic ? 'bg-black border-black text-white shadow-md' : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                      }`}
                      title="Italic"
                    >
                      <Italic className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleStyle(selectedCellIndex, 'underline')}
                      className={`flex-1 flex justify-center py-2 border rounded-lg transition-all ${
                        currentCell.styles.underline ? 'bg-black border-black text-white shadow-md' : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                      }`}
                      title="Underline"
                    >
                      <Underline className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
                {/* Page Title Customization */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Page Title</label>
                  <input
                    type="text"
                    value={pages[activePageIndex]}
                    onChange={(e) => updatePageTitle(e.target.value)}
                    placeholder="Enter page title"
                    maxLength={20}
                    className="w-full p-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 transition-all font-medium"
                  />
                  <div className="text-[9px] text-gray-400 text-right">
                    {pages[activePageIndex].length}/20 characters
                  </div>
                </div>

                <div className="h-px bg-gray-100" />

                <div className="space-y-1">
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select Template</h3>
                  <p className="text-[10px] text-gray-400">Choose a layout for all pages</p>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  {TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateChange(template)}
                      className={`group flex items-center gap-4 p-3 rounded-xl border transition-all text-left ${
                        selectedTemplate.id === template.id
                          ? "bg-gray-200 border-gray-400 shadow-lg shadow-black/10"
                          : "bg-white border-gray-100 hover:border-gray-300 text-gray-900"
                      }`}
                    >
                      <div className="shrink-0 w-12 h-12 bg-gray-50 rounded-lg flex flex-col items-center justify-center gap-0.5 border border-gray-100 group-hover:border-gray-200 transition-colors">
                        <div className="flex flex-col">
                          {template.parts.map((part, pIdx) => {
                            const totalHeight = template.parts.reduce((acc, p) => acc + p.height, 0);
                            const maxHeight = Math.max(template.width, totalHeight);
                            return (
                              <div
                                key={pIdx}
                                className={`bg-gray-200 border-x border-gray-300 ${pIdx === 0 ? 'rounded-t-[1px] border-t' : ''} ${pIdx === template.parts.length - 1 ? 'rounded-b-[1px] border-b' : 'border-b border-dotted'}`}
                                style={{
                                  width: `${(template.width / maxHeight) * 30}px`,
                                  height: `${(part.height / maxHeight) * 30}px`,
                                }}
                              />
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-bold truncate text-gray-900`}>
                          {template.name}
                        </div>
                        <div className={`text-[10px] font-mono ${selectedTemplate.id === template.id ? 'text-gray-400' : 'text-gray-400'}`}>
                          {template.width}x{template.parts.reduce((acc, p) => acc + p.height, 0)}mm
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Footer / Status Bar */}
      <footer className="h-8 border-t border-gray-200 bg-white flex items-center justify-end px-4 shrink-0 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
        <span>v0.0.1</span>
      </footer>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowConfirmModal(false)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-sm relative z-10 overflow-hidden"
          >
            <div className="p-6 space-y-4">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                <Plus className="w-6 h-6 text-red-500 rotate-45" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-sm font-bold text-gray-900">
                  {confirmMode === 'template' ? 'Reset all labels?' : 'Start new project?'}
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {confirmMode === 'template' 
                    ? 'Changing the template will delete all existing label text across all pages. This action cannot be undone.'
                    : 'Starting a new project will clear all current labels, pages, and project settings. This action cannot be undone.'}
                </p>
              </div>
            </div>
            <div className="flex border-t border-gray-100">
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-3 text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors border-r border-gray-100"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmAction}
                className="flex-1 px-4 py-3 text-xs font-bold text-red-500 hover:bg-red-50 transition-colors"
              >
                {confirmMode === 'template' ? 'Reset & Change' : 'Clear & Start New'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Hidden Print Container */}
      <div id="print-container" ref={printContainerRef} className="hidden">
        {pages.map((_, pageIdx) => (
          <div key={pageIdx} className="print-page">
            <div 
              className="relative bg-white"
              style={{
                width: '210mm',
                height: '297mm',
                padding: '10mm'
              }}
            >
              <div 
                className="grid h-full w-full"
                style={{
                  gridTemplateColumns: `repeat(${Math.floor(190 / selectedTemplate.width)}, min-content)`,
                  alignContent: 'start',
                  justifyContent: 'center',
                  gap: '0px'
                }}
              >
                {Array.from({ 
                  length: Math.floor(190 / selectedTemplate.width) * 
                          Math.floor(277 / selectedTemplate.parts.reduce((acc, p) => acc + p.height, 0)) 
                }).map((_, i) => {
                  const cellData = cellsData[pageIdx]?.[i];
                  const totalHeight = selectedTemplate.parts.reduce((acc, p) => acc + p.height, 0);

                  return (
                    <div 
                      key={i}
                      className="border border-gray-200 relative overflow-hidden"
                      style={{
                        width: `${selectedTemplate.width}mm`,
                        height: `${totalHeight}mm`
                      }}
                    >
                      <div className="flex flex-col h-full">
                        {selectedTemplate.parts.map((part, pIdx) => (
                          <div 
                            key={pIdx}
                            className="relative"
                            style={{ height: `${(part.height / totalHeight) * 100}%` }}
                          >
                            {pIdx < selectedTemplate.parts.length - 1 && (
                              <div className="absolute bottom-0 left-0 right-0 border-b border-dotted border-gray-300" />
                            )}
                            {part.isWritable && (
                              <div 
                                className={`absolute inset-0 p-1 flex flex-col justify-center ${
                                  cellData?.textAlign === 'left' ? 'items-start text-left' :
                                  cellData?.textAlign === 'right' ? 'items-end text-right' :
                                  'items-center text-center'
                                }`}
                              >
                                <span 
                                  className={`text-[10px] leading-tight break-words whitespace-pre-line w-full px-1 ${
                                    cellData?.styles.bold ? 'font-bold' : 'font-normal'
                                  } ${
                                    cellData?.styles.italic ? 'italic' : ''
                                  } ${
                                    cellData?.styles.underline ? 'underline' : ''
                                  }`}
                                >
                                  {cellData?.text || ""}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
