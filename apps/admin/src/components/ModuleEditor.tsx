// @ts-nocheck
import React from 'react';
import { useAutosave } from '../hooks/useCourseEditor';

export const ModuleEditor = ({
  handleSaveCourseModule,
  courseModuleForm,
  setCourseModuleForm,
  selectedCourseModuleId
}) => {

  const { saveStatus } = useAutosave(courseModuleForm, 1500, () => {
    if (selectedCourseModuleId && courseModuleForm.title) {
       handleSaveCourseModule();
    }
  });

  return (
    <form
                        className="badge-form-grid badge-form-grid-compact"
                        onSubmit={(event) => void handleSaveCourseModule(event)}
                      >
                        <label className="form-wide">
                          <span>Título</span>
                          <input
                            value={courseModuleForm.title}
                            onChange={(event) =>
                              setCourseModuleForm((current) => ({
                                ...current,
                                title: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label className="form-wide">
                          <span>Resumen</span>
                          <textarea
                            rows={2}
                            value={courseModuleForm.summary}
                            onChange={(event) =>
                              setCourseModuleForm((current) => ({
                                ...current,
                                summary: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <div className="course-inline-fields">
                          <label>
                            <span>Duración</span>
                            <input
                              type="number"
                              value={courseModuleForm.durationMinutes}
                              onChange={(event) =>
                                setCourseModuleForm((current) => ({
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
                              value={courseModuleForm.order}
                              onChange={(event) =>
                                setCourseModuleForm((current) => ({
                                  ...current,
                                  order: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <label>
                            <span>Estado</span>
                            <select
                              value={courseModuleForm.status}
                              onChange={(event) =>
                                setCourseModuleForm((current) => ({
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
                        </div>
                        <label className="switch-row">
                          <input
                            type="checkbox"
                            checked={courseModuleForm.isActive}
                            onChange={(event) =>
                              setCourseModuleForm((current) => ({
                                ...current,
                                isActive: event.target.checked,
                              }))
                            }
                          />
                          <span>
                            {courseModuleForm.isActive ? "Activo" : "Inactivo"}
                          </span>
                        </label>
                        <div className="editor-actions form-wide">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
    <button type="submit" className="primary-button">
                            {selectedCourseModuleId
                              ? "Guardar módulo"
                              : "Crear módulo"}
                          </button>
    {saveStatus === 'saving' && <span className="text-secondary">Guardando...</span>}
    {saveStatus === 'saved' && <span className="text-success">Guardado</span>}
    {saveStatus === 'error' && <span className="text-error">Error al guardar</span>}
  </div>
                        </div>
                      </form>
  );
};
