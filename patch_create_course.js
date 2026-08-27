const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'apps/admin/src/App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Insert handleCreateDraftCourse function inside the component, near openCourseWorkspaceTab
const draftCourseFn = `
  const handleCreateDraftCourse = useCallback(async (tab: CourseWorkspaceTab = "data") => {
    setIsCreatingCourse(true);
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
      setIsCreatingCourse(false);
    }
  }, [apiBaseUrl, openCourseWorkspaceTab, setCourses]);

  const openCourseWorkspaceTab = useCallback(`;

if (!content.includes('handleCreateDraftCourse')) {
  content = content.replace(/  const openCourseWorkspaceTab = useCallback\(/, draftCourseFn);
}

// Replace openCourseWorkspaceTab(null, "data") with handleCreateDraftCourse("data")
content = content.replace(/onClick=\{\(\) =>\s*openCourseWorkspaceTab\(null, "data"\)\s*\}/g, 'onClick={() => handleCreateDraftCourse("data")}');
content = content.replace(/onClick=\{\(\) => openCourseWorkspaceTab\(null, "library"\)\}/g, 'onClick={() => handleCreateDraftCourse("library")}');
// There might be onClick={() => openCourseWorkspaceTab(null, "data")}
content = content.replace(/openCourseWorkspaceTab\(null, "data"\)/g, 'handleCreateDraftCourse("data")');
content = content.replace(/openCourseWorkspaceTab\(null, "library"\)/g, 'handleCreateDraftCourse("library")');

fs.writeFileSync(filePath, content, 'utf8');
