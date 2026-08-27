const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'apps/admin/src/App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Insert handleCreateDraftCourse inside the component, near openCourseWorkspaceTab
const draftCourseFn = `
  const handleCreateDraftCourse = useCallback(async () => {
    setIsCreatingCourse(true);
    try {
      const response = await fetch(\`\${apiBaseUrl}/api/admin/courses\`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Curso nuevo en borrador",
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
        openCourseWorkspaceTab(json.item.id, "data");
      } else {
        alert(json.error ?? "No se pudo crear el curso.");
      }
    } catch (e) {
      alert("Error de red");
    } finally {
      setIsCreatingCourse(false);
    }
  }, [apiBaseUrl, openCourseWorkspaceTab]);

  const openCourseWorkspaceTab = useCallback(`;

content = content.replace(/  const openCourseWorkspaceTab = useCallback\(/, draftCourseFn);

// Replace openCourseWorkspaceTab(null, "data") with handleCreateDraftCourse()
content = content.replace(/onClick=\{\(\) => openCourseWorkspaceTab\(null, "data"\)\}/g, 'onClick={handleCreateDraftCourse}');

// Replace Nuevo curso text to Crear curso in one place? The user doesn't care, but sure.

fs.writeFileSync(filePath, content, 'utf8');
