const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'apps/admin/src/App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// We need to add autosave state
const stateDeclarations = `
  const [courseSaveStatus, setCourseSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [courseFormRef, setCourseFormRef] = useState(courseForm);
`;
content = content.replace(/  const \[courseForm, setCourseForm\] = useState\(\n    buildCourseForm\(null\),\n  \);/, `  const [courseForm, setCourseForm] = useState(
    buildCourseForm(null),
  );\n` + stateDeclarations);

// Update courseFormRef when courseForm changes
// Use effect for debounced autosave
const autosaveEffect = `
  useEffect(() => {
    setCourseFormRef(courseForm);
    if (!selectedCourseId) return;

    const timer = setTimeout(() => {
      // Check if actually changed compared to saved state? We can just save it.
      if (courseSaveStatus !== "saving") {
         setCourseSaveStatus("saving");
         // Call the save logic
         handleSaveCourse(new Event("submit") as any).then(() => {
           setCourseSaveStatus("saved");
         }).catch(() => {
           setCourseSaveStatus("error");
         });
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [courseForm, selectedCourseId]);
`;

// Where to put this? Right before handleSaveCourse.
content = content.replace(/  async function handleSaveCourse/, autosaveEffect + '\n  async function handleSaveCourse');

// Add visual indicator for save status
content = content.replace(
  /className="course-workspace-shell course-create-shell"/g,
  'className={`course-workspace-shell course-create-shell autosave-${courseSaveStatus}`}'
);

content = content.replace(
  /<button\n\s*type="submit"\n\s*className="primary-button"/g,
  `<span>{courseSaveStatus === "saving" ? "Guardando..." : courseSaveStatus === "saved" ? "Guardado" : courseSaveStatus === "error" ? "Error al guardar" : "Sin guardar"}</span>\n                      <button\n                        type="submit"\n                        className="primary-button"`
);

fs.writeFileSync(filePath, content, 'utf8');
