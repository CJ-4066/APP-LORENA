// @ts-nocheck
import React from 'react';

import { AdminFileUploader } from './AdminFileUploader';
import { CurriculumEditor } from './CurriculumEditor';
import { LessonEditor } from './LessonEditor';
import { PublishPanel } from './PublishPanel';
import { LessonResourceEditor } from './LessonResourceEditor';
import { CourseGeneralForm } from './CourseGeneralForm';
import type {
  CourseWorkspaceTab,
  AdminCourse,
  AdminCourseModule,
  AdminCourseLesson,
  AdminCourseResource,
  AdminLibraryPdf,
  CourseAuditLogEntry,
  ActionIcon
} from '../App';

export interface CourseWorkspaceProps {
  apiBaseUrl: any;
  courseAuditEntries: any;
  courseAuditError: any;
  courseDrawerTab: any;
  courseError: any;
  courseForm: any;
  courseLessonForm: any;
  courseMessage: any;
  courseModuleForm: any;
  courseResourceForm: any;
  courses: any;
  formatAuditFieldLabel: any;
  formatDate: any;
  getCourseAuditActionLabel: any;
  getCourseAuditElementLabel: any;
  handleCloseCourseDrawer: any;
  handleLibraryPdfAction: any;
  handleOpenAuditEntry: any;
  handlePublishCourse: any;
  handleSaveCourse: any;
  handleSaveCourseLesson: any;
  handleSaveCourseModule: any;
  handleSaveCourseResource: any;
  handleSaveLibraryPdf: any;
  handleSelectCourseDrawerTab: any;
  isCreatingCourse: any;
  libraryBulkNotice: any;
  libraryCategorySuggestions: any;
  libraryPdfFile: any;
  libraryPdfForm: any;
  libraryPdfs: any;
  openCourseWorkspaceTab: any;
  openLibraryPdfEditor: any;
  prettifyLibraryFileTitle: any;
  resetLibraryPdfDraft: any;
  savingCourseId: any;
  selectedCourse: any;
  selectedCourseId: any;
  selectedCourseLessonId: any;
  selectedCourseLessons: any;
  selectedCourseModuleId: any;
  selectedCourseModules: any;
  selectedCourseResourceId: any;
  selectedCourseResources: any;
  selectedLibraryCourse: any;
  selectedLibraryPdfId: any;
  setCourseForm: any;
  setCourseLessonForm: any;
  setCourseModuleForm: any;
  setCourseResourceForm: any;
  setLibraryBulkNotice: any;
  setLibraryPdfFile: any;
  setLibraryPdfForm: any;
  setSelectedCourseLessonId: any;
  setSelectedCourseModuleId: any;
  setSelectedCourseResourceId: any;
  summarizeAuditValue: any;
}

export const CourseWorkspace: React.FC<CourseWorkspaceProps> = ({
  apiBaseUrl,
  courseAuditEntries,
  courseAuditError,
  courseDrawerTab,
  courseError,
  courseForm,
  courseLessonForm,
  courseMessage,
  courseModuleForm,
  courseResourceForm,
  courses,
  formatAuditFieldLabel,
  formatDate,
  getCourseAuditActionLabel,
  getCourseAuditElementLabel,
  handleCloseCourseDrawer,
  handleLibraryPdfAction,
  handleOpenAuditEntry,
  handlePublishCourse,
  handleSaveCourse,
  handleSaveCourseLesson,
  handleSaveCourseModule,
  handleSaveCourseResource,
  handleSaveLibraryPdf,
  handleSelectCourseDrawerTab,
  isCreatingCourse,
  libraryBulkNotice,
  libraryCategorySuggestions,
  libraryPdfFile,
  libraryPdfForm,
  libraryPdfs,
  openCourseWorkspaceTab,
  openLibraryPdfEditor,
  prettifyLibraryFileTitle,
  resetLibraryPdfDraft,
  savingCourseId,
  selectedCourse,
  selectedCourseId,
  selectedCourseLessonId,
  selectedCourseLessons,
  selectedCourseModuleId,
  selectedCourseModules,
  selectedCourseResourceId,
  selectedCourseResources,
  selectedLibraryCourse,
  selectedLibraryPdfId,
  setCourseForm,
  setCourseLessonForm,
  setCourseModuleForm,
  setCourseResourceForm,
  setLibraryBulkNotice,
  setLibraryPdfFile,
  setLibraryPdfForm,
  setSelectedCourseLessonId,
  setSelectedCourseModuleId,
  setSelectedCourseResourceId,
  summarizeAuditValue,
}) => {

  return (
            <section
              className={
                isCreatingCourse
                  ? "admin-panel admin-panel-wide course-workspace-page course-workspace-page-create"
                  : "admin-panel admin-panel-wide course-workspace-page"
              }
            >
          <div
            className={
              isCreatingCourse
                ? "course-workspace-shell course-create-shell"
                : "course-workspace-shell"
            }
          >
            <div className="audit-detail-head course-drawer-head">
              <div>
                <p className="eyebrow">
                  {courseDrawerTab === "library" ? "Biblioteca" : "Cursos"}
                </p>
                <h2 id="course-drawer-title">
                  {courseDrawerTab === "library"
                    ? selectedLibraryPdfId
                      ? "Editar PDF"
                      : "Nuevo PDF"
                    : selectedCourse
                      ? `Editar ${selectedCourse.title}`
                      : "Nuevo curso"}
                </h2>
                <p className="badge-editor-copy">
                  {courseDrawerTab === "library"
                    ? "Datos del PDF, categoría, vínculo opcional y publicación."
                    : isCreatingCourse
                      ? "Completa las casillas y crea el curso. El material quedará vinculado automáticamente."
                      : "Datos del curso, material y publicación."}
                </p>
              </div>
              <div className="course-drawer-head-actions">
                {!isCreatingCourse ? (
                  <>
                    <span className="topbar-pill">
                      {selectedCourse?.status === "published"
                        ? "Publicado"
                        : selectedCourse?.status === "archived"
                          ? "Archivado"
                          : "Borrador"}
                    </span>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => openCourseWorkspaceTab(null, "data")}
                    >
                      Nuevo curso
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleCloseCourseDrawer}
                >
                  Cerrar
                </button>
              </div>
            </div>

            <div
              className={
                isCreatingCourse
                  ? "course-drawer-layout course-drawer-layout-create"
                  : "course-drawer-layout"
              }
            >
              {!isCreatingCourse ? (
                <aside className="course-drawer-sidebar">
                <div className="course-drawer-summary">
                  <div>
                    <span className="course-drawer-kicker">
                      Vista del curso
                    </span>
                    <strong>
                      {selectedCourse?.title ?? "Nuevo curso sin nombre"}
                    </strong>
                    <p>
                      {selectedCourse
                        ? selectedCourse.subtitle || "Sin subtítulo todavía"
                        : "Completa la base, luego agrega módulos, lecciones y publicación."}
                    </p>
                  </div>
                  <div className="course-drawer-metrics">
                    <div>
                      <span>Módulos</span>
                      <strong>{selectedCourseModules.length}</strong>
                    </div>
                    <div>
                      <span>Lecciones</span>
                      <strong>{selectedCourseLessons.length}</strong>
                    </div>
                    <div>
                      <span>Recursos</span>
                      <strong>{selectedCourseResources.length}</strong>
                    </div>
                  </div>
                </div>

                <div className="course-drawer-rail">
                  {[
                    ["data", "Datos", "Información y archivo del curso"],
                    ["modules", "Módulos", "Temario y contenido del curso"],
                    ["history", "Historial", "Auditoría y cambios"],
                  ].map(([value, label, hint]) => (
                    <button
                      key={value}
                      type="button"
                      className={
                        courseDrawerTab === value
                          ? "course-drawer-nav-item course-drawer-nav-item-active"
                          : "course-drawer-nav-item"
                      }
                      onClick={() =>
                        handleSelectCourseDrawerTab(value as CourseWorkspaceTab)
                      }
                    >
                      <strong>{label}</strong>
                      <span>{hint}</span>
                    </button>
                  ))}
                </div>

                <div className="course-drawer-note">
                  <span>Atajo</span>
                  <p>
                    Usa la pestaña activa para editar una sola capa del curso
                    sin perder el contexto del resto.
                  </p>
                </div>
                </aside>
              ) : null}

              <section className="course-drawer-main">
                {courseError ? (
                  <p className="badge-feedback badge-feedback-error">
                    {courseError}
                  </p>
                ) : null}
                {courseMessage ? (
                  <p className="badge-feedback badge-feedback-success">
                    {courseMessage}
                  </p>
                ) : null}

                {courseDrawerTab === "data" ? (
                  <CourseGeneralForm
  courseForm={courseForm}
  setCourseForm={setCourseForm}
  handleSaveCourse={handleSaveCourse}
  savingCourseId={savingCourseId}
  isCreatingCourse={isCreatingCourse}
  handleCloseCourseDrawer={handleCloseCourseDrawer}
  apiBaseUrl={apiBaseUrl}
  selectedCourseId={selectedCourseId}
/>
                ) : null}

                <CurriculumEditor
  courseDrawerTab={courseDrawerTab}
  selectedCourseId={selectedCourseId}
  selectedCourse={selectedCourse}
  selectedCourseModules={selectedCourseModules}
  selectedCourseModuleId={selectedCourseModuleId}
  courseModuleForm={courseModuleForm}
  setCourseModuleForm={setCourseModuleForm}
  setSelectedCourseModuleId={setSelectedCourseModuleId}
  setSelectedCourseLessonId={setSelectedCourseLessonId}
  handleSaveCourseModule={handleSaveCourseModule}
  courseLessonForm={courseLessonForm}
  setCourseLessonForm={setCourseLessonForm}
  handleSaveCourseLesson={handleSaveCourseLesson}
  selectedCourseLessons={selectedCourseLessons}
  selectedCourseLessonId={selectedCourseLessonId}
  handleSelectCourseDrawerTab={handleSelectCourseDrawerTab}
/>

                {courseDrawerTab === "lessons" ? (
                <LessonEditor
  courseDrawerTab={courseDrawerTab}
  apiBaseUrl={apiBaseUrl}
  selectedCourseId={selectedCourseId}
  selectedCourse={selectedCourse}
  selectedCourseModules={selectedCourseModules}
  selectedCourseModuleId={selectedCourseModuleId}
  setSelectedCourseModuleId={setSelectedCourseModuleId}
  selectedCourseLessonId={selectedCourseLessonId}
  setSelectedCourseLessonId={setSelectedCourseLessonId}
  courseLessonForm={courseLessonForm}
  setCourseLessonForm={setCourseLessonForm}
  handleSaveCourseLesson={handleSaveCourseLesson}
  handleSelectCourseDrawerTab={handleSelectCourseDrawerTab}
  selectedCourseLessons={selectedCourseLessons}
/>
                ) : null}

                {courseDrawerTab === "resources" ? (
                  <div className="course-subview-grid">
                    <article className="course-subview-card">
                      <div className="panel-head">
                        <div>
                          <strong>Recurso</strong>
                          <p>
                            {selectedCourse?.title ?? "Selecciona un curso"}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => {
                            setSelectedCourseResourceId(null);
                            setCourseResourceForm({
                              title: "",
                              kind: "link",
                              description: "",
                              url: "",
                              status: "draft",
                              isActive: true,
                            });
                          }}
                        >
                          Nuevo
                        </button>
                      </div>
                      <form
                        className="badge-form-grid badge-form-grid-compact"
                        onSubmit={(event) =>
                          void handleSaveCourseResource(event)
                        }
                      >
                        <label className="form-wide">
                          <span>Título</span>
                          <input
                            value={courseResourceForm.title}
                            onChange={(event) =>
                              setCourseResourceForm((current) => ({
                                ...current,
                                title: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label>
                          <span>Tipo</span>
                          <select
                            value={courseResourceForm.kind}
                            onChange={(event) =>
                              setCourseResourceForm((current) => ({
                                ...current,
                                kind: event.target.value,
                              }))
                            }
                          >
                            <option value="pdf">PDF</option>
                            <option value="canva">Canva</option>
                            <option value="file">Archivo</option>
                            <option value="image">Imagen</option>
                            <option value="link">Enlace</option>
                          </select>
                        </label>
                        <label className="form-wide">
                          <span>Descripción</span>
                          <textarea
                            rows={3}
                            value={courseResourceForm.description}
                            onChange={(event) =>
                              setCourseResourceForm((current) => ({
                                ...current,
                                description: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label className="form-wide">
                          <span>Archivo o enlace Canva</span>
                          <input
                            placeholder="Pega el enlace Canva/PDF o sube un archivo abajo"
                            value={courseResourceForm.url}
                            onChange={(event) =>
                              setCourseResourceForm((current) => ({
                                ...current,
                                url: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <div className="form-wide">
                          <AdminFileUploader
                            apiBaseUrl={apiBaseUrl}
                            label="Recurso descargable"
                            description="Sube PDF, DOC, DOCX o imagen; para Canva pega el enlace compartido."
                            accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            mode="general"
                            value={courseResourceForm.url}
                            category="course"
                            entityType="course_resource"
                            entityId={selectedCourseResourceId ?? undefined}
                            onUploaded={(asset) =>
                              setCourseResourceForm((current) => ({
                                ...current,
                                kind:
                                  asset.mimeType === "application/pdf"
                                    ? "pdf"
                                    : asset.mimeType.startsWith("image/")
                                      ? "image"
                                      : "file",
                                url: asset.publicUrl,
                              }))
                            }
                            onClear={() =>
                              setCourseResourceForm((current) => ({
                                ...current,
                                url: "",
                              }))
                            }
                          />
                        </div>
                        <div className="editor-actions form-wide">
                          <button type="submit" className="primary-button">
                            Guardar recurso
                          </button>
                        </div>
                      </form>
                    </article>

                    <article className="course-subview-card course-subview-list-card">
                      <div className="panel-head">
                        <div>
                          <p className="eyebrow">Lista</p>
                          <h3>{selectedCourseResources.length} recursos</h3>
                        </div>
                      </div>
                      {selectedCourseResources.length > 0 ? (
                        <div className="course-item-list">
                          {selectedCourseResources.map((resource) => (
                            <article
                              key={resource.id}
                              className="course-item-row"
                            >
                              <div>
                                <strong>{resource.title}</strong>
                                <p>{resource.description}</p>
                              </div>
                              <div className="course-item-meta">
                                <span>{resource.kind}</span>
                                <strong className="topbar-pill">
                                  {resource.status ?? "draft"}
                                </strong>
                                <button
                                  type="button"
                                  className="secondary-button"
                                  onClick={() => {
                                    setSelectedCourseResourceId(resource.id);
                                    setCourseResourceForm({
                                      title: resource.title,
                                      kind: resource.kind,
                                      description: resource.description,
                                      url: resource.url,
                                      status: resource.status ?? "draft",
                                      isActive: resource.isActive ?? true,
                                    });
                                    handleSelectCourseDrawerTab("resources");
                                  }}
                                >
                                  Editar
                                </button>
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <div className="empty-state">
                          <h3>No hay recursos todavía.</h3>
                          <p>
                            Agrega PDFs, enlaces o materiales extra para
                            complementar el curso.
                          </p>
                        </div>
                      )}
                    </article>
                  </div>
                ) : null}

                <LessonResourceEditor
  courseDrawerTab={courseDrawerTab}
  libraryBulkNotice={libraryBulkNotice}
  setLibraryBulkNotice={setLibraryBulkNotice}
  libraryPdfFile={libraryPdfFile}
  setLibraryPdfFile={setLibraryPdfFile}
  libraryPdfForm={libraryPdfForm}
  setLibraryPdfForm={setLibraryPdfForm}
  handleSaveLibraryPdf={handleSaveLibraryPdf}
  selectedLibraryPdfId={selectedLibraryPdfId}
  apiBaseUrl={apiBaseUrl}
  selectedLibraryCourse={selectedLibraryCourse}
  libraryCategorySuggestions={libraryCategorySuggestions}
  selectedCourseId={selectedCourseId}
  selectedCourse={selectedCourse}
  courses={courses}
  libraryPdfs={libraryPdfs}
  prettifyLibraryFileTitle={prettifyLibraryFileTitle}
  resetLibraryPdfDraft={resetLibraryPdfDraft}
  handleLibraryPdfAction={handleLibraryPdfAction}
  openLibraryPdfEditor={openLibraryPdfEditor}
  selectedCourseResources={selectedCourseResources}
  courseResourceForm={courseResourceForm}
  setCourseResourceForm={setCourseResourceForm}
  handleSaveCourseResource={handleSaveCourseResource}
  selectedCourseResourceId={selectedCourseResourceId}
  setSelectedCourseResourceId={setSelectedCourseResourceId}
/>

                <PublishPanel
  courseDrawerTab={courseDrawerTab}
  selectedCourse={selectedCourse}
  handlePublishCourse={handlePublishCourse}
/>

                {courseDrawerTab === "history" ? (
                  <section className="course-audit-panel">
                    <div className="panel-head">
                      <div>
                        <p className="eyebrow">Historial</p>
                        <h3>Cambios registrados</h3>
                      </div>
                    </div>

                    {courseAuditError ? (
                      <p className="badge-feedback badge-feedback-error">
                        {courseAuditError}
                      </p>
                    ) : null}

                    {courseAuditEntries.length > 0 ? (
                      <div className="audit-table">
                        <div className="audit-table-head audit-table-row">
                          <span>Fecha</span>
                          <span>Acción</span>
                          <span>Elemento</span>
                          <span>Campo</span>
                          <span>Antes</span>
                          <span>Después</span>
                          <span>Origen</span>
                          <span />
                        </div>
                        {courseAuditEntries.map((entry) => (
                          <article key={entry.id} className="audit-table-row">
                            <span>{formatDate(entry.changedAt)}</span>
                            <span>
                              {getCourseAuditActionLabel(
                                entry.action,
                                entry.fieldChanged,
                              )}
                            </span>
                            <span>{getCourseAuditElementLabel(entry)}</span>
                            <span>
                              {formatAuditFieldLabel(entry.fieldChanged)}
                            </span>
                            <span>
                              {summarizeAuditValue(entry.previousValue)}
                            </span>
                            <span>{summarizeAuditValue(entry.newValue)}</span>
                            <span>{entry.changedBy}</span>
                            <span className="align-right">
                              <button
                                type="button"
                                className="secondary-button audit-detail-button"
                                onClick={() => handleOpenAuditEntry(entry)}
                              >
                                Ver detalle
                              </button>
                            </span>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-state">
                        <h3>No hay cambios registrados todavía.</h3>
                        <p>
                          Los cambios de curso, módulos, lecciones, PDFs y
                          recursos aparecerán aquí.
                        </p>
                      </div>
                    )}
                  </section>
                ) : null}
              </section>
            </div>
          </div>
        </section>

  );
};
