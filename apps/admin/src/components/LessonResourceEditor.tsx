// @ts-nocheck
import React from 'react';
import { ActionIcon } from '../App';
import { AdminFileUploader } from './AdminFileUploader';

export const LessonResourceEditor = ({
  courseDrawerTab,
  libraryBulkNotice,
  setLibraryBulkNotice,
  libraryPdfFile,
  setLibraryPdfFile,
  libraryPdfForm,
  setLibraryPdfForm,
  handleSaveLibraryPdf,
  selectedLibraryPdfId,
  apiBaseUrl,
  selectedLibraryCourse,
  libraryCategorySuggestions,
  selectedCourseId,
  selectedCourse,
  courses,
  libraryPdfs,
  prettifyLibraryFileTitle,
  resetLibraryPdfDraft,
  handleLibraryPdfAction,
  openLibraryPdfEditor,
  handleAutoAttachCourseResource,
  selectedCourseResources,
  courseResourceForm,
  setCourseResourceForm,
  handleSaveCourseResource,
  selectedCourseResourceId,
  setSelectedCourseResourceId
}) => {
  if (courseDrawerTab !== "library") return null;
  return (

                  <>
                    {libraryBulkNotice ? (
                      <section
                        className={`library-notice library-notice-${libraryBulkNotice.tone}`}
                      >
                        <div className="library-notice-icon" aria-hidden="true">
                          <ActionIcon
                            name={
                              libraryBulkNotice.tone === "success"
                                ? "success"
                                : libraryBulkNotice.tone === "warning"
                                  ? "warning"
                                  : libraryBulkNotice.tone === "info"
                                    ? "info"
                                    : "close"
                            }
                          />
                        </div>
                        <div className="library-notice-copy">
                          <strong>{libraryBulkNotice.title}</strong>
                          <p>{libraryBulkNotice.message}</p>
                          {libraryBulkNotice.details &&
                          libraryBulkNotice.details.length > 0 ? (
                            <ul>
                              {libraryBulkNotice.details.map((detail) => (
                                <li key={detail}>{detail}</li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          className="secondary-button library-notice-close"
                          onClick={() => setLibraryBulkNotice(null)}
                        >
                          <span className="button-icon" aria-hidden="true">
                            <ActionIcon name="close" />
                          </span>
                        </button>
                      </section>
                    ) : null}

                    <div className="course-subview-grid">
                      <article className="course-subview-card">
                        <div className="panel-head">
                          <div>
                            <strong>
                              {selectedLibraryPdfId
                                ? "Editar PDF"
                                : "Nuevo PDF"}
                            </strong>
                            <p>Biblioteca formativa</p>
                          </div>
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => {
                              resetLibraryPdfDraft(null);
                            }}
                          >
                            Nuevo
                          </button>
                        </div>
                        <p className="muted-copy">
                          Este editor sirve para ajustar un PDF ya cargado o
                          crear uno nuevo con vínculo opcional a un curso.
                        </p>
                        <form
                          className="badge-form-grid badge-form-grid-compact"
                          onSubmit={(event) => void handleSaveLibraryPdf(event)}
                        >
                          <label className="form-wide">
                            <span>Título</span>
                            <input
                              value={libraryPdfForm.title}
                              onChange={(event) =>
                                setLibraryPdfForm((current) => ({
                                  ...current,
                                  title: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <label className="form-wide">
                            <span>Archivo PDF, DOC o DOCX</span>
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                              onChange={(event) => {
                                const file = event.target.files?.[0] ?? null;
                                setLibraryPdfFile(file);
                                if (file && !libraryPdfForm.title.trim()) {
                                  const prettyName = prettifyLibraryFileTitle(
                                    file.name,
                                  );
                                  if (prettyName) {
                                    setLibraryPdfForm((current) => ({
                                      ...current,
                                      title: prettyName,
                                    }));
                                  }
                                }
                              }}
                            />
                            <p className="muted-copy" style={{ marginTop: 8 }}>
                              {libraryPdfFile
                                ? `Seleccionado: ${libraryPdfFile.name}`
                                : libraryPdfForm.fileUrl
                                  ? "Archivo actual cargado"
                                  : "Selecciona un PDF, DOC o DOCX para subirlo al servidor."}
                            </p>
                          </label>
                          <label className="form-wide">
                            <div className="library-toggle-row">
                              <span>Categoría</span>
                              <label className="switch-row compact">
                                <input
                                  type="checkbox"
                                  checked={libraryPdfForm.assignCategory}
                                  onChange={(event) =>
                                    setLibraryPdfForm((current) => ({
                                      ...current,
                                      assignCategory: event.target.checked,
                                      category: event.target.checked
                                        ? current.category
                                        : "",
                                    }))
                                  }
                                />
                                <span>Asignar</span>
                              </label>
                            </div>
                            {libraryPdfForm.assignCategory ? (
                              <>
                                <input
                                  list="library-category-suggestions"
                                  value={libraryPdfForm.category}
                                  onChange={(event) =>
                                    setLibraryPdfForm((current) => ({
                                      ...current,
                                      category: event.target.value,
                                    }))
                                  }
                                  placeholder="Ej. Guías, Tarot, Ritual"
                                />
                                <datalist id="library-category-suggestions">
                                  {libraryCategorySuggestions.map(
                                    (category) => (
                                      <option key={category} value={category} />
                                    ),
                                  )}
                                </datalist>
                              </>
                            ) : (
                              <p className="muted-copy">
                                Se guardará como General.
                              </p>
                            )}
                          </label>
                          <div className="library-link-card form-wide">
                            <div className="library-link-card-head">
                              <div>
                                <span className="course-drawer-kicker">
                                  Relación con curso
                                </span>
                                <strong>Vinculación opcional</strong>
                              </div>
                              <label className="switch-row">
                                <input
                                  type="checkbox"
                                  checked={libraryPdfForm.linkToCourse}
                                  onChange={(event) =>
                                    setLibraryPdfForm((current) => ({
                                      ...current,
                                      linkToCourse: event.target.checked,
                                      courseId: event.target.checked
                                        ? current.courseId
                                        : "",
                                    }))
                                  }
                                />
                                <span>Vincular a un curso</span>
                              </label>
                            </div>
                            <p className="muted-copy">
                              La categoría organiza la app móvil. El vínculo a
                              curso solo agrega contexto editorial.
                            </p>
                            {libraryPdfForm.linkToCourse ? (
                              <select
                                value={libraryPdfForm.courseId}
                                onChange={(event) =>
                                  setLibraryPdfForm((current) => ({
                                    ...current,
                                    courseId: event.target.value,
                                  }))
                                }
                              >
                                <option value="">Selecciona un curso</option>
                                {courses.map((course) => (
                                  <option key={course.id} value={course.id}>
                                    {course.title}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div className="library-link-preview">
                                <span className="topbar-pill">Sin vínculo</span>
                                <p>
                                  {selectedLibraryCourse
                                    ? `Si activas la vinculación se asociará con ${selectedLibraryCourse.title}.`
                                    : "No estará asociado a ningún curso."}
                                </p>
                              </div>
                            )}
                          </div>
                          <label>
                            <span>Estado</span>
                            <select
                              value={libraryPdfForm.status}
                              onChange={(event) =>
                                setLibraryPdfForm((current) => ({
                                  ...current,
                                  status: event.target.value as
                                    "draft" | "published",
                                }))
                              }
                            >
                              <option value="published">Publicado</option>
                              <option value="draft">Borrador</option>
                            </select>
                          </label>
                          <div className="editor-actions form-wide">
                            <button type="submit" className="primary-button">
                              Guardar PDF
                            </button>
                          </div>
                        </form>
                      </article>

                      <article className="course-subview-card course-subview-list-card">
                        <div className="panel-head">
                          <div>
                            <p className="eyebrow">Lista</p>
                            <h3>{libraryPdfs.length} PDFs</h3>
                          </div>
                        </div>
                        {libraryPdfs.length > 0 ? (
                          <div className="library-list">
                            {libraryPdfs.map((pdf) => (
                              <article
                                key={pdf.id}
                                className="library-list-row"
                              >
                                <div className="library-list-main">
                                  <div className="library-list-title">
                                    <strong>{pdf.title}</strong>
                                    <p>
                                      {pdf.description || "Sin descripción"}
                                    </p>
                                  </div>
                                  <div className="library-list-meta">
                                    <span>{pdf.category}</span>
                                    <span>
                                      {pdf.courseId
                                        ? pdf.courseId
                                        : "Sin vínculo"}
                                    </span>
                                    <span>{pdf.pageCount} páginas</span>
                                    <span className="topbar-pill">
                                      {pdf.status ?? "draft"}
                                    </span>
                                  </div>
                                </div>
                                <div className="library-list-actions">
                                  <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={() => openLibraryPdfEditor(pdf)}
                                  >
                                    Editar
                                  </button>
                                  <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={() => {
                                      if (
                                        window.confirm(
                                          `¿Eliminar "${pdf.title}"?`,
                                        )
                                      ) {
                                        void handleLibraryPdfAction(
                                          pdf.id,
                                          "delete",
                                        );
                                      }
                                    }}
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              </article>
                            ))}
                          </div>
                        ) : (
                          <div className="empty-state">
                            <h3>No hay PDFs todavía.</h3>
                            <p>
                              Sube material de apoyo para que la biblioteca
                              quede ordenada por curso.
                            </p>
                          </div>
                        )}
                      </article>
                    </div>
                  </>

  );
};
