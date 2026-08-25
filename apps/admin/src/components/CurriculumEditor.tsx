// @ts-nocheck
import React from 'react';
import { ModuleEditor } from './ModuleEditor';

export const CurriculumEditor = ({
  courseDrawerTab,
  selectedCourseId,
  selectedCourse,
  selectedCourseModules,
  selectedCourseModuleId,
  courseModuleForm,
  setCourseModuleForm,
  setSelectedCourseModuleId,
  setSelectedCourseLessonId,
  handleSaveCourseModule,
  courseLessonForm,
  setCourseLessonForm,
  handleSaveCourseLesson,
  selectedCourseLessons,
  selectedCourseLessonId,
  handleSelectCourseDrawerTab,
}) => {
  if (courseDrawerTab !== "modules") return null;
  return (

                  <div className="course-subview-grid course-subview-grid-modules">
                    <article className="course-subview-card">
                      <div className="panel-head">
                        <div>
                          <p className="eyebrow">Módulos</p>
                          <h3>
                            {selectedCourseModuleId
                              ? "Editar módulo"
                              : "Nuevo módulo"}
                          </h3>
                          <p>
                            {selectedCourse?.title ?? "Selecciona un curso"}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => {
                            setSelectedCourseModuleId(null);
                            setCourseModuleForm({
                              title: "",
                              summary: "",
                              durationMinutes: "",
                              order: "",
                              status: "draft",
                              isActive: true,
                            });
                          }}
                        >
                          Nuevo
                        </button>
                      </div>
                      <ModuleEditor
  handleSaveCourseModule={handleSaveCourseModule}
  courseModuleForm={courseModuleForm}
  setCourseModuleForm={setCourseModuleForm}
  selectedCourseModuleId={selectedCourseModuleId}
/>
                    </article>

                    <article className="course-subview-card course-subview-list-card">
                      <div className="panel-head">
                        <div>
                          <p className="eyebrow">Lista</p>
                          <h3>{selectedCourseModules.length} módulos</h3>
                        </div>
                      </div>
                      {selectedCourseModules.length > 0 ? (
                        <div className="course-item-list">
                          {selectedCourseModules.map((module) => (
                            <article
                              key={module.id}
                              className="course-item-row"
                            >
                              <div>
                                <strong>{module.title}</strong>
                                <p>{module.summary}</p>
                              </div>
                              <div className="course-item-meta">
                                <span>{module.lessons.length} lecciones</span>
                                <strong className="topbar-pill">
                                  {module.status ?? "draft"}
                                </strong>
                                <button
                                  type="button"
                                  className="secondary-button"
                                  onClick={() => {
                                    setSelectedCourseModuleId(module.id);
                                    setCourseModuleForm({
                                      title: module.title,
                                      summary: module.summary,
                                      durationMinutes: String(
                                        module.durationMinutes,
                                      ),
                                      order: String(module.order ?? 1),
                                      status: module.status ?? "draft",
                                      isActive: module.isActive ?? true,
                                    });
                                    handleSelectCourseDrawerTab("modules");
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
                          <h3>No hay módulos todavía.</h3>
                          <p>
                            Agrega el primer módulo para empezar a estructurar
                            el curso.
                          </p>
                        </div>
                      )}
                    </article>
                  </div>
                );
};
