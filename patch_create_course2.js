const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'apps/admin/src/App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Insert isCreatingDraft state
content = content.replace(
  'const [isCourseDrawerOpen, setIsCourseDrawerOpen] = useState(',
  'const [isCreatingDraft, setIsCreatingDraft] = useState(false);\n  const [isCourseDrawerOpen, setIsCourseDrawerOpen] = useState('
);

// We need to define handleCreateDraftCourse *after* openCourseWorkspaceTab.
// Let's find: `  const handleNavigateSection = useCallback(` which is right after openCourseWorkspaceTab.
const draftCourseFn = `
  const handleCreateDraftCourse = useCallback(async (tab: CourseWorkspaceTab = "data") => {
    setIsCreatingDraft(true);
    try {
      const response = await fetch(\`\${apiBaseUrl}/api/admin/courses\`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Curso nuevo (borrador)",
          status: "draft"
        }),
      });
      const json = await response.json();
      if (response.ok && json.item) {
        setCourses((current) => {
          const index = current.findIndex(c => c.id === json.item.id);
          if (index >= 0) {
             const copy = [...current];
             copy[index] = json.item;
             return copy;
          }
          return [json.item, ...current];
        });
        openCourseWorkspaceTab(json.item.id, tab);
      } else {
        alert(json.error ?? "No se pudo crear el curso en borrador.");
      }
    } catch (e) {
      alert("Error de red al crear borrador.");
    } finally {
      setIsCreatingDraft(false);
    }
  }, [apiBaseUrl, openCourseWorkspaceTab, setCourses]);

  const handleNavigateSection = useCallback(`;

content = content.replace(/  const handleNavigateSection = useCallback\(/, draftCourseFn);

// Replace button calls
content = content.replace(/onClick=\{\(\) =>\s*openCourseWorkspaceTab\(null, "data"\)\s*\}/g, 'onClick={() => handleCreateDraftCourse("data")} disabled={isCreatingDraft}');
content = content.replace(/onClick=\{\(\) => openCourseWorkspaceTab\(null, "library"\)\}/g, 'onClick={() => handleCreateDraftCourse("library")} disabled={isCreatingDraft}');

// Some are onClick={() => openCourseWorkspaceTab(null, "data")} -> 'onClick={() => handleCreateDraftCourse("data")}'
// I'll just regex replace openCourseWorkspaceTab(null, ...) inside onClick.
content = content.replace(/openCourseWorkspaceTab\(null, "data"\)/g, 'handleCreateDraftCourse("data")');
content = content.replace(/openCourseWorkspaceTab\(null, "library"\)/g, 'handleCreateDraftCourse("library")');

// Wait! In `CourseWorkspace.tsx` we use `isCreatingCourse`. I didn't change that.
// That is computed and passed down. So `CourseWorkspace` won't know if it's creating draft, but wait, if it's already created, `selectedCourseId` will NOT be null. 
// So `isCreatingCourse` inside CourseWorkspace will be FALSE because `selectedCourseId` is not null.
// That's exactly what we want! We are editing a draft, not creating one.

fs.writeFileSync(filePath, content, 'utf8');
