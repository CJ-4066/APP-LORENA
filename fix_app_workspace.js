const fs = require('fs');

let content = fs.readFileSync('apps/admin/src/App.tsx', 'utf8');

const startIndex = content.indexOf('{isCourseDrawerOpen ? (');
let balance = 0;
let endIndex = -1;

for (let i = startIndex + 23; i < content.length; i++) {
  if (content.substr(i, 1) === '(') balance++;
  if (content.substr(i, 1) === ')') {
    balance--;
    if (balance === -1) {
       const nextIndex = content.indexOf(' : null}', i);
       if (nextIndex !== -1) {
          endIndex = nextIndex + 8;
          break;
       }
    }
  }
}

if (endIndex === -1) {
  console.log("Drawer end not found");
  process.exit(1);
}

const match = content.substring(startIndex, endIndex);

const replacement = `{isCourseDrawerOpen ? (
      <CourseWorkspace
        apiBaseUrl={apiBaseUrl}
        courseAuditEntries={courseAuditEntries}
        courseAuditError={courseAuditError}
        courseDrawerTab={courseDrawerTab}
        courseError={courseError}
        courseForm={courseForm}
        courseLessonForm={courseLessonForm}
        courseMessage={courseMessage}
        courseModuleForm={courseModuleForm}
        courseResourceForm={courseResourceForm}
        courses={courses}
        formatAuditFieldLabel={formatAuditFieldLabel}
        formatDate={formatDate}
        getCourseAuditActionLabel={getCourseAuditActionLabel}
        getCourseAuditElementLabel={getCourseAuditElementLabel}
        summarizeAuditValue={summarizeAuditValue}
        handleAutoAttachCourseResource={handleAutoAttachCourseResource}
        handleCloseCourseDrawer={handleCloseCourseDrawer}
        handleLibraryPdfAction={handleLibraryPdfAction}
        handleOpenAuditEntry={handleOpenAuditEntry}
        handlePublishCourse={handlePublishCourse}
        handleSaveCourse={handleSaveCourse}
        handleSaveCourseLesson={handleSaveCourseLesson}
        handleSaveCourseModule={handleSaveCourseModule}
        handleSaveCourseResource={handleSaveCourseResource}
        handleSaveLibraryPdf={handleSaveLibraryPdf}
        handleSelectCourseDrawerTab={handleSelectCourseDrawerTab}
        isCreatingCourse={isCreatingCourse}
        libraryBulkNotice={libraryBulkNotice}
        libraryCategorySuggestions={libraryCategorySuggestions}
        libraryPdfFile={libraryPdfFile}
        libraryPdfForm={libraryPdfForm}
        libraryPdfs={libraryPdfs}
        openCourseWorkspaceTab={openCourseWorkspaceTab}
        openLibraryPdfEditor={openLibraryPdfEditor}
        prettifyLibraryFileTitle={prettifyLibraryFileTitle}
        resetLibraryPdfDraft={resetLibraryPdfDraft}
        savingCourseId={savingCourseId}
        selectedCourse={selectedCourse}
        selectedCourseId={selectedCourseId}
        selectedCourseLessonId={selectedCourseLessonId}
        selectedCourseLessons={selectedCourseLessons}
        selectedCourseModuleId={selectedCourseModuleId}
        selectedCourseModules={selectedCourseModules}
        selectedCourseResourceId={selectedCourseResourceId}
        selectedCourseResources={selectedCourseResources}
        selectedLibraryCourse={selectedLibraryCourse}
        selectedLibraryPdfId={selectedLibraryPdfId}
        setCourseForm={setCourseForm}
        setCourseLessonForm={setCourseLessonForm}
        setCourseModuleForm={setCourseModuleForm}
        setCourseResourceForm={setCourseResourceForm}
        setLibraryBulkNotice={setLibraryBulkNotice}
        setLibraryPdfFile={setLibraryPdfFile}
        setLibraryPdfForm={setLibraryPdfForm}
        setSelectedCourseLessonId={setSelectedCourseLessonId}
        setSelectedCourseModuleId={setSelectedCourseModuleId}
        setSelectedCourseResourceId={setSelectedCourseResourceId}
      />
) : null}`;

content = content.replace(match, replacement);

if (!content.includes('import { CourseWorkspace }')) {
  content = content.replace('import { AdminFileUploader } from "./components/AdminFileUploader";', 'import { AdminFileUploader } from "./components/AdminFileUploader";\nimport { CourseWorkspace } from "./components/CourseWorkspace";');
}

// Add types
content = content.replace(/type CourseWorkspaceTab =/g, 'export type CourseWorkspaceTab =');
content = content.replace(/type AdminCourse =/g, 'export type AdminCourse =');
content = content.replace(/type AdminCourseModule =/g, 'export type AdminCourseModule =');
content = content.replace(/type AdminCourseLesson =/g, 'export type AdminCourseLesson =');
content = content.replace(/type AdminCourseResource =/g, 'export type AdminCourseResource =');
content = content.replace(/type AdminLibraryPdf =/g, 'export type AdminLibraryPdf =');
content = content.replace(/type CourseAuditLogEntry =/g, 'export type CourseAuditLogEntry =');
content = content.replace('type ActionIconName =', 'export type ActionIconName =');
content = content.replace('function ActionIcon({ name }', 'export function ActionIcon({ name }');

// Let's add handleCreateDraftCourse right now in this patch!
content = content.replace(
  'const [isCourseDrawerOpen, setIsCourseDrawerOpen] = useState(',
  'const [isCreatingDraft, setIsCreatingDraft] = useState(false);\n  const [isCourseDrawerOpen, setIsCourseDrawerOpen] = useState('
);

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
content = content.replace(/onClick=\{\(\) =>\s*openCourseWorkspaceTab\(null, "data"\)\s*\}/g, 'onClick={() => handleCreateDraftCourse("data")} disabled={isCreatingDraft}');
content = content.replace(/onClick=\{\(\) => openCourseWorkspaceTab\(null, "library"\)\}/g, 'onClick={() => handleCreateDraftCourse("library")} disabled={isCreatingDraft}');
content = content.replace(/openCourseWorkspaceTab\(null, "data"\)/g, 'handleCreateDraftCourse("data")');
content = content.replace(/openCourseWorkspaceTab\(null, "library"\)/g, 'handleCreateDraftCourse("library")');

fs.writeFileSync('apps/admin/src/App.tsx', content, 'utf8');
