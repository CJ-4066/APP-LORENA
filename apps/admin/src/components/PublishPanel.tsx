// @ts-nocheck
import React from 'react';

export const PublishPanel = ({
  courseDrawerTab,
  selectedCourse,
  handlePublishCourse
}) => {
  if (courseDrawerTab !== "publication") return null;
  return (

                  <section className="course-publication-grid">
                    <article className="course-subview-card">
                      <div className="panel-head">
                        <div>
                          <p className="eyebrow">Publicación</p>
                          <h3>Estado actual</h3>
                        </div>
                      </div>
                      <div className="metric-card">
                        <span>
                          {selectedCourse?.title ?? "Selecciona un curso"}
                        </span>
                        <strong>{selectedCourse?.status ?? "draft"}</strong>
                        <p>
                          {selectedCourse?.status === "published"
                            ? "Visible para alumnos"
                            : selectedCourse?.status === "archived"
                              ? "Archivado"
                              : "Aún en edición"}
                        </p>
                      </div>
                    </article>
                    <article className="course-subview-card">
                      <div className="panel-head">
                        <div>
                          <p className="eyebrow">Acciones</p>
                          <h3>Control de publicación</h3>
                        </div>
                      </div>
                      <div className="course-publication-actions">
                        <button
                          type="button"
                          className="primary-button button-with-icon"
                          onClick={() => void handlePublishCourse("publish")}
                        >
                          <span className="button-icon" aria-hidden="true">
                            <ActionIcon name="publish" />
                          </span>
                          <span>Publicar</span>
                        </button>
                        <button
                          type="button"
                          className="secondary-button button-with-icon"
                          onClick={() => void handlePublishCourse("unpublish")}
                        >
                          <span className="button-icon" aria-hidden="true">
                            <ActionIcon name="refresh" />
                          </span>
                          <span>Volver a borrador</span>
                        </button>
                        <button
                          type="button"
                          className="danger-button button-with-icon"
                          onClick={() => void handlePublishCourse("archive")}
                        >
                          <span className="button-icon" aria-hidden="true">
                            <ActionIcon name="archive" />
                          </span>
                          <span>Archivar</span>
                        </button>
                      </div>
                    </article>
                  </section>

  );
};
