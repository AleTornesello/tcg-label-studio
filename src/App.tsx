import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { cn } from "./lib/utils";
import { Button } from "./components/ui/Button";
import { Input } from "./components/ui/Input";
import { Label } from "./components/ui/Label";
import { Card } from "./components/ui/Card";
import { TEMPLATES, type Template, LocalStorageKeys, PRESET_COLORS, PRESET_TEXT_COLORS } from "./constants";
import {
  Plus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Type,
  Printer,
  Download,
  Loader2,
  Menu,
  X,
  FolderOpen,
  ChevronRight,
  FileUp,
  FileDown,
  Trash2,
  Layout,
  Save,
  Image as ImageIcon,
  Search,
  ArrowUpLeft,
  ArrowUp,
  ArrowUpRight,
  ArrowLeft,
  Minimize2,
  ArrowRight,
  ArrowDownLeft,
  ArrowDown,
  ArrowDownRight,
  Heart
} from "lucide-react";

interface CellData {
  text: string;
  textAlign: 'left' | 'center' | 'right';
  color?: string;
  textColor?: string;
  bgImageUrl?: string;
  bgImageSize?: 'contain' | 'cover';
  bgImagePosition?: string;
  bgImageEffect?: 'none' | 'grayscale';
  bgImageOpacity?: number;
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
  const [customTemplates, setCustomTemplates] = useState<Template[]>(() => {
    const saved = localStorage.getItem(LocalStorageKeys.CustomTemplates);
    return saved ? JSON.parse(saved) : [];
  });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmMode, setConfirmMode] = useState<'template' | 'new_project' | 'delete_page'>('template');
  const [showCustomTemplateModal, setShowCustomTemplateModal] = useState(false);
  const [isTemplatesSubmenuOpen, setIsTemplatesSubmenuOpen] = useState(false);
  const [editingCustomTemplate, setEditingCustomTemplate] = useState<Template | null>(null);
  const [pendingTemplate, setPendingTemplate] = useState<Template | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showAllProjectsModal, setShowAllProjectsModal] = useState(false);
  const [projectSearchTerm, setProjectSearchTerm] = useState("");
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

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedCellIndex === null) return;

      // Don't navigate if user is typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const cols = Math.floor(190 / selectedTemplate.width);
      const totalHeight = selectedTemplate.parts.reduce((acc, p) => acc + p.height, 0);
      const rows = Math.floor(277 / totalHeight);
      const totalCells = cols * rows;

      let newIndex = selectedCellIndex;

      switch (e.key) {
        case 'ArrowUp':
          newIndex = selectedCellIndex - cols;
          break;
        case 'ArrowDown':
          newIndex = selectedCellIndex + cols;
          break;
        case 'ArrowLeft':
          newIndex = selectedCellIndex - 1;
          break;
        case 'ArrowRight':
          newIndex = selectedCellIndex + 1;
          break;
        case 'Escape':
          setSelectedCellIndex(null);
          return;
        default:
          return;
      }

      if (newIndex >= 0 && newIndex < totalCells) {
        e.preventDefault();
        setSelectedCellIndex(newIndex);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCellIndex, selectedTemplate]);

  const loadProject = (project: Project) => {
    setProjectId(project.id);
    setProjectName(project.name);
    setPages(project.pages);
    setActivePageIndex(0);
    const allTemplates = [...TEMPLATES, ...customTemplates];
    const template = allTemplates.find(t => t.id === project.templateId) || TEMPLATES[0];
    setSelectedTemplate(template);
    setCellsData(project.cellsData);
    setSelectedCellIndex(null);
    setIsMenuOpen(false);
    localStorage.setItem(LocalStorageKeys.LastOpened, project.id);
  };

  const saveCustomTemplate = (template: Template) => {
    setCustomTemplates(prev => {
      const filtered = prev.filter(t => t.id !== template.id);
      const updated = [template, ...filtered];
      localStorage.setItem(LocalStorageKeys.CustomTemplates, JSON.stringify(updated));
      return updated;
    });
    setShowCustomTemplateModal(false);
    setEditingCustomTemplate(null);
  };

  const deleteCustomTemplate = (id: string, e: any) => {
    e.stopPropagation();
    setCustomTemplates(prev => {
      const updated = prev.filter(t => t.id !== id);
      localStorage.setItem(LocalStorageKeys.CustomTemplates, JSON.stringify(updated));
      return updated;
    });
    if (selectedTemplate.id === id) {
      setSelectedTemplate(TEMPLATES[0]);
    }
  };

  const deleteProject = (id: string, e: any) => {
    e.stopPropagation();
    setSavedProjects(prev => {
      const updated = prev.filter(p => p.id !== id);
      localStorage.setItem(LocalStorageKeys.Projects, JSON.stringify(updated));
      return updated;
    });
  };

  const exportCustomTemplates = () => {
    const dataStr = JSON.stringify(customTemplates, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    saveAs(blob, 'tcg-custom-templates.json');
  };

  const importCustomTemplates = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const importedTemplates = JSON.parse(content) as Template[];
        
        if (!Array.isArray(importedTemplates)) throw new Error('Invalid format');
        
        const currentIds = new Set(customTemplates.map(t => t.id));
        const newTemplates = [...customTemplates];
        
        importedTemplates.forEach(template => {
          if (template.id && template.name && template.width && Array.isArray(template.parts)) {
            const idToUse = currentIds.has(template.id) ? Date.now().toString() + Math.random().toString(36).substring(2, 9) : template.id;
            newTemplates.push({
              ...template,
              id: idToUse
            });
            currentIds.add(idToUse);
          }
        });

        setCustomTemplates(newTemplates);
        localStorage.setItem(LocalStorageKeys.CustomTemplates, JSON.stringify(newTemplates));
      } catch (err) {
        alert('Invalid template file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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
    } else if (confirmMode === 'delete_page') {
      executeDeletePage();
    }
    setShowConfirmModal(false);
    setPendingTemplate(null);
  };

  const handleDeletePage = () => {
    if (pages.length <= 1) return;

    const pageData = cellsData[activePageIndex];
    const hasLabels = pageData ? Object.values(pageData).some((cell: CellData) => cell.text.trim() !== "") : false;

    if (hasLabels) {
      setConfirmMode('delete_page');
      setShowConfirmModal(true);
    } else {
      executeDeletePage();
    }
  };

  const executeDeletePage = () => {
    const newPages = pages.filter((_, i) => i !== activePageIndex);

    // Shift cellsData for subsequent pages
    const newCellsData: Record<number, Record<number, CellData>> = {};
    Object.keys(cellsData).forEach((pageIdx) => {
      const idx = parseInt(pageIdx);
      const data = cellsData[idx];
      if (idx < activePageIndex) {
        newCellsData[idx] = data;
      } else if (idx > activePageIndex) {
        newCellsData[idx - 1] = data;
      }
    });

    setPages(newPages);
    setCellsData(newCellsData);
    setActivePageIndex(Math.max(0, activePageIndex - 1));
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
              color: '#ffffff',
              textColor: '#000000',
              bgImageSize: 'cover',
              bgImagePosition: 'center center',
              bgImageEffect: 'none',
              bgImageOpacity: 100,
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
      color: '#ffffff',
      textColor: '#000000',
      bgImageSize: 'cover',
      bgImagePosition: 'center center',
      bgImageEffect: 'none',
      bgImageOpacity: 100,
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
    color: '#ffffff',
    textColor: '#000000',
    bgImageSize: 'cover',
    bgImagePosition: 'center center',
    bgImageEffect: 'none',
    bgImageOpacity: 100,
    styles: { bold: false, italic: false, underline: false }
  }) : null;

  // Extract unique custom colors used in the current project
  const projectCustomColors = Array.from(new Set(
    Object.values(cellsData).flatMap(page =>
      Object.values(page)
        .map(cell => cell.color)
        .filter(color => color && color !== '#ffffff' && !PRESET_COLORS.includes(color))
    )
  )) as string[];

  // Extract unique custom text colors used in the current project
  const projectCustomTextColors = Array.from(new Set(
    Object.values(cellsData).flatMap(page =>
      Object.values(page)
        .map(cell => cell.textColor)
        .filter(color => color && color !== '#000000' && color !== '#ffffff' && !PRESET_TEXT_COLORS.includes(color))
    )
  )) as string[];

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Toolbar / Header */}
      <header className="h-14 border-b border-border-main bg-white flex items-center justify-between px-4 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <img src="./logo.svg" alt="Logo" className="h-7" referrerPolicy="no-referrer" />
          <h1 className="font-semibold text-sm tracking-tight text-text-main">TCG Label Studio</h1>
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
              className="w-64 bg-white rounded-xl shadow-2xl border border-border-main overflow-hidden flex flex-col"
            >
              <div className="py-2">
                <div className="px-3 py-2 border-b border-gray-50 mb-1">
                  <Label>File</Label>
                </div>
                <Button
                  variant="ghost"
                  onClick={handleNewProject}
                  className="w-full justify-start px-4 py-2 gap-3 rounded-none text-text-main"
                >
                  <Plus className="w-4 h-4" /> New Project
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsSubmenuOpen(!isSubmenuOpen);
                    setIsTemplatesSubmenuOpen(false);
                  }}
                  className={cn(
                    "w-full justify-start px-4 py-2 gap-3 rounded-none",
                    isSubmenuOpen ? "bg-blue-50 text-blue-700" : "text-text-main"
                  )}
                >
                  <FolderOpen className="w-4 h-4" />
                  <span className="flex-1 text-left text-xs font-bold">Open Project</span>
                  <ChevronRight className={cn("w-3 h-3 transition-transform", isSubmenuOpen && "rotate-90")} />
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsTemplatesSubmenuOpen(!isTemplatesSubmenuOpen);
                    setIsSubmenuOpen(false);
                  }}
                  className={cn(
                    "w-full justify-start px-4 py-2 gap-3 rounded-none",
                    isTemplatesSubmenuOpen ? "bg-blue-50 text-blue-700" : "text-text-main"
                  )}
                >
                  <Layout className="w-4 h-4" />
                  <span className="flex-1 text-left text-xs font-bold">Custom Templates</span>
                  <ChevronRight className={cn("w-3 h-3 transition-transform", isTemplatesSubmenuOpen && "rotate-90")} />
                </Button>

                <div className="h-px bg-border-main my-2" />
                <div className="px-3 py-2 border-b border-gray-50 mb-1">
                  <Label>Share</Label>
                </div>

                <Button
                  variant="ghost"
                  onClick={() => {
                    window.print();
                    setIsMenuOpen(false);
                  }}
                  className="w-full justify-start px-4 py-2 gap-3 rounded-none text-text-main"
                >
                  <Printer className="w-4 h-4" /> Print All
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => {
                    exportAllAsPng();
                    setIsMenuOpen(false);
                  }}
                  disabled={isExporting}
                  className="w-full justify-start px-4 py-2 gap-3 rounded-none text-text-main"
                >
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {isExporting ? 'Exporting...' : 'Export PNGs'}
                </Button>

                <Button
                  variant="ghost"
                  onClick={exportProject}
                  className="w-full justify-start px-4 py-2 gap-3 rounded-none text-text-main"
                >
                  <FileDown className="w-4 h-4" /> Export Project (.json)
                </Button>

                <label className="w-full cursor-pointer">
                  <div className="w-full px-4 py-2 text-xs text-text-main hover:bg-bg-main flex items-center gap-3 transition-colors">
                    <FileUp className="w-4 h-4" /> Import Project (.json)
                  </div>
                  <input
                    type="file"
                    accept=".json"
                    onChange={importProject}
                    className="hidden"
                  />
                </label>
              </div>
            </motion.div>

            {isTemplatesSubmenuOpen && (
              <motion.div
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="w-72 bg-white rounded-xl shadow-2xl border border-border-main overflow-hidden flex flex-col max-h-[calc(100vh-120px)]"
              >
                <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
                  <div className="px-3 py-2 flex items-center justify-between">
                    <Label>Custom Templates</Label>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingCustomTemplate({
                          id: Date.now().toString(),
                          name: "New Template",
                          width: 63,
                          parts: [{ height: 15, isWritable: true }],
                          custom: true
                        });
                        setShowCustomTemplateModal(true);
                      }}
                      className="w-7 h-7 text-primary hover:border-blue-100"
                      title="Create new template"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="space-y-1 px-2">
                    {customTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="group flex items-center gap-2 p-2 rounded-lg hover:bg-bg-main transition-colors cursor-pointer"
                        onClick={() => {
                          setIsMenuOpen(false);
                          setIsTemplatesSubmenuOpen(false);
                          setEditingCustomTemplate(template);
                          setShowCustomTemplateModal(true);
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-text-main truncate">{template.name}</div>
                          <div className="text-[9px] text-text-accent font-mono">{template.width}x{template.parts.reduce((acc, p) => acc + p.height, 0)}mm</div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="danger"
                            size="icon"
                            onClick={(e) => deleteCustomTemplate(template.id, e)}
                            className="p-1.5 h-7 w-7"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {customTemplates.length === 0 && (
                      <div className="px-3 py-8 text-center">
                        <p className="text-[10px] text-text-accent">No custom templates found</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-2 border-t border-border-main space-y-1">
                  <Button
                    variant="ghost"
                    onClick={exportCustomTemplates}
                    disabled={customTemplates.length === 0}
                    className="w-full justify-start px-3 py-2 text-text-main"
                  >
                    <FileDown className="w-4 h-4" /> Export Templates
                  </Button>
                  <label className="w-full cursor-pointer">
                    <div className="w-full px-3 py-2 text-xs text-text-main hover:bg-bg-main flex items-center gap-3 transition-colors rounded-lg">
                      <FileUp className="w-4 h-4" /> Import Templates
                    </div>
                    <input
                      type="file"
                      accept=".json"
                      onChange={importCustomTemplates}
                      className="hidden"
                    />
                  </label>
                </div>
              </motion.div>
            )}
            {isSubmenuOpen && (
              <motion.div
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="w-72 bg-white rounded-xl shadow-2xl border border-border-main overflow-hidden flex flex-col max-h-[calc(100vh-120px)]"
              >
                <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
                  <div className="px-3 py-2">
                    <Label>Recent Projects</Label>
                  </div>
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
                          className={cn(
                            "group w-full px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-all cursor-pointer",
                            projectId === project.id ? "bg-blue-50 text-blue-700" : "text-text-muted hover:bg-bg-main"
                          )}
                        >
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold truncate text-text-main">{project.name}</span>
                            <span className="text-[9px] opacity-60">
                              {new Date(project.lastModified).toLocaleDateString()}
                            </span>
                          </div>
                          <Button
                            variant="danger"
                            size="icon"
                            onClick={(e) => deleteProject(project.id, e)}
                            className="p-1 opacity-0 group-hover:opacity-100 h-6 w-6"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    {savedProjects.length === 0 && (
                      <div className="px-3 py-8 text-center">
                        <p className="text-[10px] text-text-accent">No saved projects found</p>
                      </div>
                    )}
                  </div>
                </div>
                {savedProjects.length > 0 && (
                  <div className="p-2 border-t border-border-main">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowAllProjectsModal(true);
                        setIsMenuOpen(false);
                        setIsSubmenuOpen(false);
                        setProjectSearchTerm("");
                      }}
                      className="w-full text-primary hover:bg-blue-50"
                    >
                      Show all projects ({savedProjects.length > 999 ? '999+' : savedProjects.length})
                    </Button>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* Secondary Toolbar (Contextual) */}
      <div className="h-12 border-b border-border-main bg-white flex items-center justify-between px-4 shrink-0 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 border-r border-border-main pr-4 mr-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-text-muted"
            >
              {isMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>

            <Input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value.slice(0, 30))}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.stopPropagation();
                  e.currentTarget.blur();
                }
              }}
              maxLength={30}
              className="bg-transparent border-none focus:ring-0 font-bold text-xs tracking-tight text-text-main w-56 p-0 placeholder:text-text-accent"
              placeholder="Project Name"
            />
          </div>

          <div className="flex items-center gap-2">
            {pages.map((page, index) => (
              <Button
                key={index}
                variant={activePageIndex === index ? "primary" : "secondary"}
                size="sm"
                onClick={() => {
                  setActivePageIndex(index);
                  setSelectedCellIndex(null);
                }}
                className={cn(
                  "rounded-full whitespace-nowrap",
                  activePageIndex === index ? "bg-black hover:bg-black shadow-sm" : "bg-gray-100 border-none text-gray-600 hover:bg-gray-200"
                )}
              >
                {page}
              </Button>
            ))}
            <Button
              variant="ghost"
              size="icon"
              onClick={addPage}
              className="text-gray-500 shrink-0"
              title="Add new page"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.print()}
            className="text-blue-600 hover:bg-blue-50 rounded-full shrink-0"
            title="Print all pages"
          >
            <Printer className="w-4 h-4" />
            Print All
          </Button>

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
            {isExporting ? 'Exporting...' : 'Export PNGs'}
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
                      className={`border border-gray-200 relative group/cell transition-all cursor-pointer overflow-hidden ${selectedCellIndex === i ? 'z-20 bg-blue-50/10' : 'hover:bg-blue-50/30'
                        }`}
                      style={{
                        width: `${selectedTemplate.width * (595 / 210)}px`,
                        height: `${totalHeight * (595 / 210)}px`
                      }}
                    >
                      {/* Selection Ring Overlay */}
                      <div className={`absolute inset-0 pointer-events-none z-30 transition-all ${selectedCellIndex === i
                          ? 'ring-2 ring-blue-500 ring-inset'
                          : 'group-hover/cell:ring-2 group-hover/cell:ring-blue-300 group-hover/cell:ring-inset'
                        }`} />

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
                              <>
                                {/* Background Layer (separated so filter doesn't affect text) */}
                                <div
                                  className="absolute inset-0 z-0"
                                  style={
                                    cellData?.bgImageUrl
                                      ? {
                                        backgroundImage: `url(${cellData.bgImageUrl})`,
                                        backgroundSize: cellData.bgImageSize || 'cover',
                                        backgroundPosition: cellData.bgImagePosition || 'center center',
                                        backgroundRepeat: 'no-repeat',
                                        filter: `${cellData.bgImageEffect === 'grayscale' ? 'grayscale(100%) ' : ''}opacity(${cellData.bgImageOpacity ?? 100}%)`.trim() || 'none',
                                      }
                                      : {
                                        backgroundColor: cellData?.color || '#ffffff'
                                      }
                                  }
                                />
                                {/* Text Layer */}
                                <div
                                  className={`absolute inset-0 p-1 flex flex-col justify-center pointer-events-none z-10 ${cellData?.textAlign === 'left' ? 'items-start text-left' :
                                      cellData?.textAlign === 'right' ? 'items-end text-right' :
                                        'items-center text-center'
                                    }`}
                                >
                                  <span
                                    className={`text-[10px] leading-tight break-words whitespace-pre-line w-full px-1 ${cellData?.styles.bold ? 'font-bold' : 'font-normal'
                                      } ${cellData?.styles.italic ? 'italic' : ''
                                      } ${cellData?.styles.underline ? 'underline' : ''
                                      }`}
                                    style={{ color: cellData?.textColor || '#000000' }}
                                  >
                                    {cellData?.text || ""}
                                  </span>
                                </div>
                              </>
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
        <aside className="w-72 border-l border-border-main bg-white flex flex-col shrink-0 z-20">
          <div className="p-4 border-b border-border-main flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-accent">Properties</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
            {selectedCellIndex !== null && currentCell ? (
              <div key={selectedCellIndex} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
                <div className="flex items-center justify-between">
                  <Label className="text-text-accent">Cell Properties</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedCellIndex(null)}
                    className="text-primary uppercase tracking-widest hover:text-primary-hover font-bold px-0"
                  >
                    Done
                  </Button>
                </div>
                {/* Text Input */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Type className="w-3 h-3" />
                    Label Text
                  </Label>
                  <textarea
                    autoFocus
                    value={currentCell.text}
                    onChange={(e) => updateCellData(selectedCellIndex, { text: e.target.value.split('\n').slice(0, 2).join('\n') })}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.stopPropagation();
                        e.currentTarget.blur();
                      }
                    }}
                    placeholder="Enter text (max 2 lines)"
                    rows={2}
                    className="w-full px-3 py-2 text-xs bg-gray-50 border border-border-main rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none placeholder:text-text-accent"
                  />
                  <div className="text-[9px] text-text-accent text-right">
                    {currentCell.text.split('\n').length}/2 lines
                  </div>
                </div>

                {/* Alignment */}
                <div className="space-y-2">
                  <Label>Alignment</Label>
                  <div className="flex bg-bg-main p-1 rounded-xl">
                    {(['left', 'center', 'right'] as const).map((align) => (
                      <button
                        key={align}
                        onClick={() => updateCellData(selectedCellIndex, { textAlign: align })}
                        className={cn(
                          "flex-1 flex justify-center py-1.5 rounded-lg transition-all",
                          currentCell.textAlign === align ? "bg-white shadow-sm text-text-main" : "text-text-accent hover:text-text-muted"
                        )}
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
                  <Label>Text Style</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={currentCell.styles.bold ? "primary" : "outline"}
                      onClick={() => toggleStyle(selectedCellIndex, 'bold')}
                      className={cn("flex-1", currentCell.styles.bold && "bg-black hover:bg-black border-black shadow-md")}
                      title="Bold"
                    >
                      <Bold className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={currentCell.styles.italic ? "primary" : "outline"}
                      onClick={() => toggleStyle(selectedCellIndex, 'italic')}
                      className={cn("flex-1", currentCell.styles.italic && "bg-black hover:bg-black border-black shadow-md")}
                      title="Italic"
                    >
                      <Italic className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={currentCell.styles.underline ? "primary" : "outline"}
                      onClick={() => toggleStyle(selectedCellIndex, 'underline')}
                      className={cn("flex-1", currentCell.styles.underline && "bg-black hover:bg-black border-black shadow-md")}
                      title="Underline"
                    >
                      <Underline className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Text Color */}
                <div className="space-y-2">
                  <Label>Text Color</Label>
                  <div className="flex items-start gap-2">
                    <div
                      className="w-8 h-8 rounded-full border border-gray-200 shadow-inner shrink-0 overflow-hidden relative cursor-pointer group"
                      style={{ backgroundColor: currentCell.textColor || '#000000' }}
                    >
                      <input
                        type="color"
                        value={currentCell.textColor || '#000000'}
                        onChange={(e) => updateCellData(selectedCellIndex, { textColor: e.target.value })}
                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                        title="Choose custom text color"
                      />
                    </div>

                    {/* Predefined text colors */}
                    <div className="min-h-8 flex gap-1.5 flex-1 overflow-x-auto no-scrollbar p-1 flex-wrap">
                      {[...PRESET_TEXT_COLORS, ...projectCustomTextColors].map(presetColor => (
                        <button
                          key={`text-${presetColor}`}
                          onClick={() => updateCellData(selectedCellIndex, { textColor: presetColor })}
                          className={`w-6 h-6 rounded-full border shrink-0 transition-all ${currentCell.textColor === presetColor ? 'ring-2 ring-blue-500 ring-offset-1 border-transparent' : 'border-gray-200'}`}
                          style={{ backgroundColor: presetColor }}
                          title={presetColor === '#000000' ? 'Black' : presetColor === '#ffffff' ? 'White' : undefined}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Background Color */}
                <div className="space-y-2">
                  <Label>Background Color</Label>
                  <div className="flex items-start gap-2">
                    <div
                      className="w-8 h-8 rounded-full border border-gray-200 shadow-inner shrink-0 overflow-hidden relative cursor-pointer group"
                      style={{ backgroundColor: currentCell.color || '#ffffff' }}
                    >
                      <input
                        type="color"
                        value={currentCell.color || '#ffffff'}
                        onChange={(e) => updateCellData(selectedCellIndex, { color: e.target.value })}
                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                        title="Choose custom background color"
                      />
                    </div>

                    {/* Predefined colors */}
                    <div className="min-h-8 flex gap-1.5 flex-1 overflow-x-auto no-scrollbar p-1 flex-wrap">
                      {[...PRESET_COLORS, ...projectCustomColors].map(presetColor => (
                        <button
                          key={`bg-${presetColor}`}
                          onClick={() => updateCellData(selectedCellIndex, { color: presetColor })}
                          className={`w-6 h-6 rounded-full border shrink-0 transition-all ${currentCell.color === presetColor ? 'ring-2 ring-black ring-offset-1 border-transparent' : 'border-gray-200'}`}
                          style={{ backgroundColor: presetColor }}
                          title={presetColor === '#ffffff' ? 'White' : undefined}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Background Image Settings */}
                <div className="space-y-4 pt-2 border-t border-gray-100">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight flex items-center gap-2">
                      <ImageIcon className="w-3 h-3" />
                      Background Image (URL)
                    </label>
                    <input
                      type="text"
                      value={currentCell.bgImageUrl || ""}
                      onChange={(e) => updateCellData(selectedCellIndex, { bgImageUrl: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                      className="w-full p-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 transition-all font-medium"
                    />
                  </div>

                  {currentCell.bgImageUrl && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      {/* Image Size Selection */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Image Size</label>
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                          {(['cover', 'contain'] as const).map((size) => (
                            <button
                              key={size}
                              onClick={() => updateCellData(selectedCellIndex, { bgImageSize: size })}
                              className={`flex-1 flex justify-center py-1.5 rounded-md transition-all text-xs font-semibold capitalize ${currentCell.bgImageSize === size ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'
                                }`}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Image Position Grid */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Image Position</label>
                        <div className="grid grid-cols-3 gap-1 bg-gray-100 p-1 rounded-lg aspect-square">
                          {[
                            { pos: 'top left', icon: ArrowUpLeft },
                            { pos: 'top center', icon: ArrowUp },
                            { pos: 'top right', icon: ArrowUpRight },
                            { pos: 'center left', icon: ArrowLeft },
                            { pos: 'center center', icon: Minimize2 },
                            { pos: 'center right', icon: ArrowRight },
                            { pos: 'bottom left', icon: ArrowDownLeft },
                            { pos: 'bottom center', icon: ArrowDown },
                            { pos: 'bottom right', icon: ArrowDownRight },
                          ].map(({ pos, icon: Icon }) => (
                            <button
                              key={pos}
                              onClick={() => updateCellData(selectedCellIndex, { bgImagePosition: pos })}
                              title={pos}
                              className={`flex items-center justify-center rounded-md transition-all ${currentCell.bgImagePosition === pos ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600 hover:bg-black/5'
                                }`}
                            >
                              <Icon className="w-4 h-4" />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Image Effects */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Image Effect</label>
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                          {(['none', 'grayscale'] as const).map((effect) => (
                            <button
                              key={effect}
                              onClick={() => updateCellData(selectedCellIndex, { bgImageEffect: effect })}
                              className={`flex-1 flex justify-center py-1.5 rounded-md transition-all text-xs font-semibold capitalize ${(currentCell.bgImageEffect || 'none') === effect ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'
                                }`}
                            >
                              {effect}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Image Opacity */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Background Opacity</label>
                          <span className="text-[10px] text-gray-500 font-medium">{(currentCell.bgImageOpacity ?? 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          step="5"
                          value={currentCell.bgImageOpacity ?? 100}
                          onChange={(e) => updateCellData(selectedCellIndex, { bgImageOpacity: parseInt(e.target.value) })}
                          className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
                {/* Page Title Customization */}
                <div className="space-y-2">
                  <Label>Page Title</Label>
                  <Input
                    type="text"
                    value={pages[activePageIndex]}
                    onChange={(e) => updatePageTitle(e.target.value)}
                    placeholder="Enter page title"
                    maxLength={20}
                    className="font-medium"
                  />
                  <div className="text-[9px] text-gray-400 text-right">
                    {pages[activePageIndex].length}/20 characters
                  </div>
                </div>

                <div className="h-px bg-gray-100" />

                <div className="space-y-1">
                  <Label>Select Template</Label>
                  <p className="text-[10px] text-gray-400">Choose a layout for all pages</p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {[...TEMPLATES, ...customTemplates].map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateChange(template)}
                      className={`group flex items-center gap-4 p-3 rounded-xl border transition-all text-left ${selectedTemplate.id === template.id
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
                <div className="h-px bg-gray-100 my-6" />

                <div className="space-y-3">
                  <Label>Page Actions</Label>
                  <Button
                    variant="danger"
                    onClick={handleDeletePage}
                    disabled={pages.length <= 1}
                    className="w-full"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Current Page
                  </Button>
                  {pages.length <= 1 && (
                    <p className="text-[9px] text-gray-400 text-center italic">Cannot delete the only page</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Footer / Status Bar */}
      <footer className="h-8 border-t border-gray-200 bg-white flex items-center justify-between px-4 shrink-0 text-[12px] font-medium text-gray-400 tracking-wider">
        <div className="flex items-center">
          <span>This website is made with&nbsp;</span>
          <Heart className="w-4 h-4 text-red-500" />
          <span>&nbsp;by&nbsp;</span>
          <a href="https://github.com/AleTornesello" className="font-bold hover:underline">Alessandro Tornesello</a>
        </div>
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
                  {confirmMode === 'template' ? 'Reset all labels?' :
                    confirmMode === 'new_project' ? 'Start new project?' :
                      'Delete this page?'}
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {confirmMode === 'template'
                    ? 'Changing the template will delete all existing label text across all pages. This action cannot be undone.'
                    : confirmMode === 'new_project'
                      ? 'Starting a new project will clear all current labels, pages, and project settings. This action cannot be undone.'
                      : 'This page contains label data. Deleting it will permanently remove all labels on this page. This action cannot be undone.'}
                </p>
              </div>
            </div>
            <div className="flex border-t border-gray-100">
              <Button
                variant="ghost"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-3 text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors border-r border-gray-100 rounded-none"
              >
                Cancel
              </Button>
              <Button
                variant="ghost"
                onClick={handleConfirmAction}
                className="flex-1 px-4 py-3 text-xs font-bold text-red-500 hover:bg-red-50 transition-colors rounded-none"
              >
                {confirmMode === 'template' ? 'Reset & Change' :
                  confirmMode === 'new_project' ? 'Clear & Start New' :
                    'Delete Page'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Custom Template Modal */}
      {showCustomTemplateModal && editingCustomTemplate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => {
              setShowCustomTemplateModal(false);
              setEditingCustomTemplate(null);
            }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Layout className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Custom Template</h3>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Design your layout</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCustomTemplateModal(false);
                  setEditingCustomTemplate(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    type="text"
                    value={editingCustomTemplate.name}
                    onChange={(e) => setEditingCustomTemplate({ ...editingCustomTemplate, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Width (mm)</Label>
                  <Input
                    type="number"
                    value={editingCustomTemplate.width}
                    onChange={(e) => setEditingCustomTemplate({ ...editingCustomTemplate, width: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {/* Parts Editor */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Template Parts</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingCustomTemplate({
                        ...editingCustomTemplate,
                        parts: [...editingCustomTemplate.parts, { height: 10, isWritable: false }]
                      });
                    }}
                    className="text-blue-600 hover:text-blue-700 flex items-center gap-1 font-bold"
                  >
                    <Plus className="w-3 h-3" /> Add Part
                  </Button>
                </div>

                <div className="space-y-3">
                  {editingCustomTemplate.parts.map((part, idx) => (
                    <div key={idx} className={cn(
                      "flex items-end gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 group",
                      part.isWritable && "bg-blue-50/30 border-blue-100"
                    )}>
                      <div className="flex-1 space-y-2">
                        <Label className="text-[9px]">Height (mm)</Label>
                        <Input
                          type="number"
                          value={part.height}
                          onChange={(e) => {
                            const newParts = [...editingCustomTemplate.parts];
                            newParts[idx] = { ...part, height: parseInt(e.target.value) || 0 };
                            setEditingCustomTemplate({ ...editingCustomTemplate, parts: newParts });
                          }}
                          className="bg-white"
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <Label className="text-[9px]">Writable</Label>
                        <Button
                          variant={part.isWritable ? "primary" : "outline"}
                          size="md"
                          onClick={() => {
                            const newParts = editingCustomTemplate.parts.map((p, i) => ({
                              ...p,
                              isWritable: i === idx ? !p.isWritable : false
                            }));
                            setEditingCustomTemplate({ ...editingCustomTemplate, parts: newParts });
                          }}
                          className={cn("w-full shadow-none", part.isWritable && "bg-blue-600 border-blue-600 text-white shadow-md")}
                        >
                          {part.isWritable ? 'Yes' : 'No'}
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (editingCustomTemplate.parts.length <= 1) return;
                          const newParts = editingCustomTemplate.parts.filter((_, i) => i !== idx);
                          setEditingCustomTemplate({ ...editingCustomTemplate, parts: newParts });
                        }}
                        disabled={editingCustomTemplate.parts.length <= 1}
                        className="text-gray-300 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="bg-bg-main rounded-xl p-8 flex items-center justify-center">
                  <div
                    className="bg-white shadow-xl border border-border-main flex flex-col overflow-hidden"
                    style={{ width: `${editingCustomTemplate.width * 2}px` }}
                  >
                    {editingCustomTemplate.parts.map((part, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "relative border-b border-border-main last:border-b-0 flex items-center justify-center",
                          part.isWritable ? "bg-white" : "bg-gray-50/50"
                        )}
                        style={{ height: `${part.height * 2}px` }}
                      >
                        {part.isWritable && <Type className="w-3 h-3 text-primary opacity-40" />}
                        {idx < editingCustomTemplate.parts.length - 1 && (
                          <div className="absolute bottom-0 left-0 right-0 border-b border-dotted border-gray-300" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-border-main flex gap-3 shrink-0">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowCustomTemplateModal(false);
                  setEditingCustomTemplate(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => saveCustomTemplate(editingCustomTemplate)}
                className="flex-1"
              >
                <Save className="w-4 h-4" /> Save Template
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* All Projects Modal */}
      {showAllProjectsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowAllProjectsModal(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-2xl border border-border-main w-full max-w-2xl relative z-10 overflow-hidden flex flex-col max-h-[80vh]"
          >
            <div className="p-6 border-b border-border-main flex flex-col gap-4 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <FolderOpen className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text-main">All Saved Projects</h3>
                    <p className="text-[10px] text-text-accent uppercase tracking-widest font-bold">Manage your collection</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowAllProjectsModal(false)}
                  className="text-text-accent"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-accent" />
                <Input
                  type="text"
                  placeholder="Search projects..."
                  value={projectSearchTerm}
                  onChange={(e) => setProjectSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {savedProjects
                  .filter(p => p.name.toLowerCase().includes(projectSearchTerm.toLowerCase()))
                  .sort((a, b) => b.lastModified - a.lastModified)
                  .map(project => (
                    <Card
                      key={project.id}
                      onClick={() => {
                        loadProject(project);
                        setShowAllProjectsModal(false);
                      }}
                      className={cn(
                        "group p-4 transition-all cursor-pointer relative",
                        projectId === project.id
                          ? "bg-blue-50 border-blue-200 ring-1 ring-blue-200"
                          : "hover:border-gray-200 hover:shadow-md"
                      )}
                    >
                      <div className="flex flex-col gap-1 pr-6">
                        <span className="text-xs font-bold text-gray-900 truncate">{project.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                            {project.pages.length} {project.pages.length === 1 ? 'Page' : 'Pages'}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(project.lastModified).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteProject(project.id, e);
                        }}
                        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </Card>
                  ))}
              </div>

              {savedProjects.filter(p => p.name.toLowerCase().includes(projectSearchTerm.toLowerCase())).length === 0 && (
                <div className="py-20 text-center">
                  <FolderOpen className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-xs text-gray-400">No matching projects found</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 flex items-center justify-end shrink-0">
              <Button
                variant="secondary"
                onClick={() => setShowAllProjectsModal(false)}
              >
                Close
              </Button>
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
                              <>
                                {/* Background Layer */}
                                <div
                                  className="absolute inset-0 z-0"
                                  style={
                                    cellData?.bgImageUrl
                                      ? {
                                        backgroundImage: `url(${cellData.bgImageUrl})`,
                                        backgroundSize: cellData.bgImageSize || 'cover',
                                        backgroundPosition: cellData.bgImagePosition || 'center center',
                                        backgroundRepeat: 'no-repeat',
                                        filter: `${cellData.bgImageEffect === 'grayscale' ? 'grayscale(100%) ' : ''}opacity(${cellData.bgImageOpacity ?? 100}%)`.trim() || 'none',
                                      }
                                      : {
                                        backgroundColor: cellData?.color || '#ffffff'
                                      }
                                  }
                                />
                                {/* Text Layer */}
                                <div
                                  className={`absolute inset-0 p-1 flex flex-col justify-center z-10 ${cellData?.textAlign === 'left' ? 'items-start text-left' :
                                      cellData?.textAlign === 'right' ? 'items-end text-right' :
                                        'items-center text-center'
                                    }`}
                                >
                                  <span
                                    className={`text-[10px] leading-tight break-words whitespace-pre-line w-full px-1 ${cellData?.styles.bold ? 'font-bold' : 'font-normal'
                                      } ${cellData?.styles.italic ? 'italic' : ''
                                      } ${cellData?.styles.underline ? 'underline' : ''
                                      }`}
                                    style={{ color: cellData?.textColor || '#000000' }}
                                  >
                                    {cellData?.text || ""}
                                  </span>
                                </div>
                              </>
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
