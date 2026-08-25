// @ts-nocheck
import React from 'react';
import { AdminFileUploader } from './AdminFileUploader';
import { useAutosave } from '../hooks/useCourseEditor';
import { CourseCoverUploader } from './CourseCoverUploader';

export const CourseGeneralForm = ({
  courseForm,
  setCourseForm,
  handleSaveCourse,
  savingCourseId,
  isCreatingCourse,
  handleCloseCourseDrawer,
  apiBaseUrl,
  selectedCourseId
}) => {

  const { saveStatus } = useAutosave(courseForm, 1500, () => {
    if (savingCourseId === null) {
       handleSaveCourse();
    }
  });

  return (
    <form
                    className="badge-editor-form course-editor-form"
                    onSubmit={(event) => void handleSaveCourse(event)}
                  >
                    <div className="course-editor-grid">
                      <section className="course-editor-card">
                        <div className="course-editor-card-head">
                          <div>
                            <p className="eyebrow">Datos principales</p>
                            <h3>Información del curso</h3>
                          </div>
                        </div>
                        <div className="badge-form-grid badge-form-grid-compact">
                          <label className="form-wide">
                            <span>Título del curso</span>
                            <input
                              required
                              value={courseForm.title}
                              onChange={(event) =>
                                setCourseForm((current) => ({
                                  ...current,
                                  title: event.target.value,
                                }))
                              }
                              placeholder="Ej: Tarot Evolutivo Nivel 1"
                            />
                          </label>
                          <label className="form-wide">
                            <span>Categoría</span>
                            <input
                              value={courseForm.category}
                              onChange={(event) =>
                                setCourseForm((current) => ({
                                  ...current,
                                  category: event.target.value,
                                }))
                              }
                              placeholder="Ej: Tarot, Astrología, General"
                            />
                          </label>
                          <label className="form-wide">
                            <span>Descripción</span>
                            <textarea
                              rows={5}
                              value={courseForm.description}
                              onChange={(event) =>
                                setCourseForm((current) => ({
                                  ...current,
                                  description: event.target.value,
                                }))
                              }
                              placeholder="Describe brevemente de qué trata este curso..."
                            />
                          </label>
                        </div>
                      </section>

                      <section className="course-editor-card course-editor-card-visual">
                        <div className="course-editor-card-head">
                          <div>
                            <p className="eyebrow">Recurso interactivo</p>
                            <h3>Presentación, Video o PDF</h3>
                          </div>
                        </div>
                        <AdminFileUploader
                          apiBaseUrl={apiBaseUrl}
                          label="Archivo del Curso"
                          description="Sube la presentación (PowerPoint, PDF) o el video del curso."
                          accept="application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,video/mp4,video/quicktime"
                          mode="general"
                          value={courseForm.resourceUrl}
                          category="course"
                          entityType="course"
                          entityId={selectedCourseId ?? undefined}
                          onUploaded={(asset) => {
                            setCourseForm((current) => ({
                              ...current,
                              resourceUrl: asset.publicUrl,
                            }));
                            void handleAutoAttachCourseResource(asset.publicUrl);
                          }}
                          onClear={() =>
                            setCourseForm((current) => ({
                              ...current,
                              resourceUrl: "",
                            }))
                          }
                        />
                        <div className="badge-form-grid badge-form-grid-compact">
                          <label className="form-wide">
                            <span>Enlace alternativo (Canva, PowerPoint Online, etc.)</span>
                            <input
                              value={courseForm.resourceUrl}
                              onChange={(event) =>
                                setCourseForm((current) => ({
                                  ...current,
                                  resourceUrl: event.target.value,
                                }))
                              }
                              placeholder="https://www.canva.com/design/... o URL externa del archivo"
                            />
                          </label>
                        </div>
                      </section>

                      <section className="course-editor-card course-editor-card-visual">
                        <div className="course-editor-card-head">
                          <div>
                            <p className="eyebrow">Portada y estado</p>
                            <h3>Publicación</h3>
                          </div>
                        </div>
                        <CourseCoverUploader
  apiBaseUrl={apiBaseUrl}
  courseForm={courseForm}
  setCourseForm={setCourseForm}
  selectedCourseId={selectedCourseId}
/>
                        <label className="form-wide">
                          <span>URL externa de portada</span>
                          <input
                            value={courseForm.coverImageUrl}
                            onChange={(event) =>
                              setCourseForm((current) => ({
                                ...current,
                                coverImageUrl: event.target.value,
                              }))
                            }
                            placeholder="https://..."
                          />
                        </label>
                        <div className="course-editor-switches">
                          <label>
                            <span>Estado</span>
                            <select
                              value={courseForm.status}
                              onChange={(event) =>
                                setCourseForm((current) => ({
                                  ...current,
                                  status: event.target.value as any,
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
                              checked={courseForm.premium}
                              onChange={(event) =>
                                setCourseForm((current) => ({
                                  ...current,
                                  premium: event.target.checked,
                                }))
                              }
                            />
                            <span>Premium</span>
                          </label>
                          <label className="switch-row">
                            <input
                              type="checkbox"
                              checked={courseForm.featured}
                              onChange={(event) =>
                                setCourseForm((current) => ({
                                  ...current,
                                  featured: event.target.checked,
                                }))
                              }
                            />
                            <span>Destacado</span>
                          </label>
                          <label className="switch-row">
                            <input
                              type="checkbox"
                              checked={courseForm.removable}
                              onChange={(event) =>
                                setCourseForm((current) => ({
                                  ...current,
                                  removable: event.target.checked,
                                }))
                              }
                            />
                            <span>Eliminable</span>
                          </label>
                        </div>
                      </section>
                    </div>

                    <div className="editor-actions course-editor-actions">
                      {courseForm.status !== "published" && (
                        <button
                          type="button"
                          className="primary-button"
                          style={{ backgroundColor: "#10b981", borderColor: "#10b981", color: "white" }}
                          disabled={savingCourseId !== null}
                          onClick={(e) => {
                            e.preventDefault();
                            setCourseForm((prev) => ({ ...prev, status: "published" }));
                            setTimeout(() => {
                              const form = e.currentTarget.closest("form");
                              if (form) form.requestSubmit();
                            }, 50);
                          }}
                        >
                          {isCreatingCourse ? "Publicar nuevo curso" : "Publicar curso"}
                        </button>
                      )}
                      <button
                        type="submit"
                        className="primary-button"
                        disabled={savingCourseId !== null}
                      >
                        {savingCourseId
                          ? "Guardando..."
                          : isCreatingCourse
                            ? "Crear curso"
                            : "Guardar cambios"}
                      </button>
                      <button type="button" className="secondary-button" onClick={handleCloseCourseDrawer}>
                        Cancelar
                      </button>
                    </div>
                  </form>
  );
};
