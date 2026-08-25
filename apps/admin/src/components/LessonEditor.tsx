// @ts-nocheck
import React from 'react';
import { useAutosave } from '../hooks/useCourseEditor';
import { AdminFileUploader } from './AdminFileUploader';

export const LessonEditor = ({
  courseDrawerTab,
  apiBaseUrl,
  selectedCourseId,
  selectedCourse,
  selectedCourseModules,
  selectedCourseModuleId,
  setSelectedCourseModuleId,
  selectedCourseLessonId,
  setSelectedCourseLessonId,
  courseLessonForm,
  setCourseLessonForm,
  handleSaveCourseLesson,
  handleSelectCourseDrawerTab,
  selectedCourseLessons,
}) => {
  const { saveStatus } = useAutosave(courseLessonForm, 1500, () => {
    if (selectedCourseLessonId && courseLessonForm.title) {
       handleSaveCourseLesson();
    }
  });

  if (courseDrawerTab !== "lessons") return null;

  return (

                  <div className="course-subview-grid">
                    <article className="course-subview-card">
                      <div className="panel-head">
                        <div>
                          <strong>
                            {selectedCourseLessonId
                              ? "Editar lección"
                              : "Nueva lección"}
                          </strong>
                          <p>
                            {selectedCourse?.title ?? "Selecciona un curso"}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => {
                            setSelectedCourseLessonId(null);
                            setCourseLessonForm({
                              title: "",
                              format: "video",
                              durationMinutes: "",
                              prompt: "",
                              content: "",
                              resourceUrl: "",
                              order: "",
                              status: "draft",
                              isActive: true,
                            });
                          }}
                        >
                          Nueva
                        </button>
                      </div>
                      <label>
                        <span>Módulo</span>
                        <select
                          value={selectedCourseModuleId ?? ""}
                          onChange={(event) =>
                            setSelectedCourseModuleId(
                              event.target.value || null,
                            )
                          }
                        >
                          <option value="">Selecciona</option>
                          {selectedCourseModules.map((module) => (
                            <option key={module.id} value={module.id}>
                              {module.title}
                            </option>
                          ))}
                        </select>
                      </label>
                      <form
                        className="badge-form-grid badge-form-grid-compact"
                        onSubmit={(event) => void handleSaveCourseLesson(event)}
                      >
                        <label className="form-wide">
                          <span>Título</span>
                          <input
                            value={courseLessonForm.title}
                            onChange={(event) =>
                              setCourseLessonForm((current) => ({
                                ...current,
                                title: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label>
                          <span>Formato</span>
                          <input
                            value={courseLessonForm.format}
                            onChange={(event) =>
                              setCourseLessonForm((current) => ({
                                ...current,
                                format: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label>
                          <span>Duración</span>
                          <input
                            type="number"
                            value={courseLessonForm.durationMinutes}
                            onChange={(event) =>
                              setCourseLessonForm((current) => ({
                                ...current,
                                durationMinutes: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label>
                          <span>Orden</span>
                          <input
                            type="number"
                            value={courseLessonForm.order}
                            onChange={(event) =>
                              setCourseLessonForm((current) => ({
                                ...current,
                                order: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label className="form-wide">
                          <span>Prompt</span>
                          <textarea
                            rows={3}
                            value={courseLessonForm.prompt}
                            onChange={(event) =>
                              setCourseLessonForm((current) => ({
                                ...current,
                                prompt: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label className="form-wide">
                          <span>Contenido</span>
                          <textarea
                            rows={4}
                            value={courseLessonForm.content}
                            onChange={(event) =>
                              setCourseLessonForm((current) => ({
                                ...current,
                                content: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label className="form-wide">
                          <span>Recurso</span>
                          <input
                            value={courseLessonForm.resourceUrl}
                            onChange={(event) =>
                              setCourseLessonForm((current) => ({
                                ...current,
                                resourceUrl: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <div className="form-wide">
                          <AdminFileUploader
                            apiBaseUrl={apiBaseUrl}
                            label="Archivo de la lección"
                            description="PDF, imagen o exportación de Canva."
                            accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,application/pdf"
                            mode="general"
                            value={courseLessonForm.resourceUrl}
                            category="lesson"
                            entityType="course_lesson"
                            entityId={selectedCourseLessonId ?? undefined}
                            onUploaded={(asset) =>
                              setCourseLessonForm((current) => ({
                                ...current,
                                resourceUrl: asset.publicUrl,
                              }))
                            }
                            onClear={() =>
                              setCourseLessonForm((current) => ({
                                ...current,
                                resourceUrl: "",
                              }))
                            }
                          />
                        </div>
                        <label>
                          <span>Estado</span>
                          <select
                            value={courseLessonForm.status}
                            onChange={(event) =>
                              setCourseLessonForm((current) => ({
                                ...current,
                                status: event.target.value,
                              }))
                            }
                          >
                            <option value="draft">Borrador</option>
                            <option value="published">Publicado</option>
                            <option value="archived">Archivado</option>
                          </select>
                        </label>
                        <label className="switch-row">
                          <input
                            type="checkbox"
                            checked={courseLessonForm.isActive}
                            onChange={(event) =>
                              setCourseLessonForm((current) => ({
                                ...current,
                                isActive: event.target.checked,
                              }))
                            }
                          />
                          <span>
                            {courseLessonForm.isActive ? "Activo" : "Inactivo"}
                          </span>
                        </label>
                        <div className="editor-actions form-wide">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
    <button type="submit" className="primary-button">
                            {selectedCourseLessonId
                              ? "Guardar lección"
                              : "Crear lección"}
                          </button>
    {saveStatus === 'saving' && <span className="text-secondary">Guardando...</span>}
    {saveStatus === 'saved' && <span className="text-success">Guardado</span>}
    {saveStatus === 'error' && <span className="text-error">Error al guardar</span>}
  </div>
                        </div>
                      </form>
                    </article>

                    <article className="course-subview-card course-subview-list-card">
                      <div className="panel-head">
                        <div>
                          <p className="eyebrow">Lista</p>
                          <h3>{selectedCourseLessons.length} lecciones</h3>
                        </div>
                      </div>
                      {selectedCourseLessons.length > 0 ? (
                        <div className="course-item-list">
                          {selectedCourseLessons.map((lesson) => (
                            <article
                              key={lesson.id}
                              className="course-item-row"
                            >
                              <div>
                                <strong>{lesson.title}</strong>
                                <p>{lesson.prompt || lesson.content}</p>
                              </div>
                              <div className="course-item-meta">
                                <span>{lesson.format}</span>
                                <strong>{lesson.durationMinutes} min</strong>
                                <span className="topbar-pill">
                                  {lesson.status ?? "draft"}
                                </span>
                                <button
                                  type="button"
                                  className="secondary-button"
                                  onClick={() => {
                                    setSelectedCourseLessonId(lesson.id);
                                    setCourseLessonForm({
                                      title: lesson.title,
                                      format: lesson.format,
                                      durationMinutes: String(
                                        lesson.durationMinutes,
                                      ),
                                      prompt: lesson.prompt,
                                      content: lesson.content ?? "",
                                      resourceUrl: lesson.resourceUrl ?? "",
                                      order: String(lesson.order ?? 1),
                                      status: lesson.status ?? "draft",
                                      isActive: lesson.isActive ?? true,
                                    });
                                    handleSelectCourseDrawerTab("lessons");
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
                          <h3>No hay lecciones todavía.</h3>
                          <p>
                            Selecciona un módulo y agrega la primera lección
                            para completar la ruta.
                          </p>
                        </div>
                      )}
                    </article>
                  </div>

  );
};
