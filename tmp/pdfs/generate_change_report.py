from __future__ import annotations

import collections
import os
import subprocess
from dataclasses import dataclass
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
OUTPUT = os.path.join(ROOT, "output/pdf/reporte_cambios_2026-08-11_a_2026-08-26.pdf")
SINCE = "2026-08-11 00:00:00 -0500"
UNTIL = "2026-08-26 23:59:59 -0500"

NAVY = colors.HexColor("#10132E")
PURPLE = colors.HexColor("#6759AA")
LAVENDER = colors.HexColor("#8F7BC5")
GOLD = colors.HexColor("#D9A04C")
CREAM = colors.HexColor("#FFF8F2")
INK = colors.HexColor("#22243B")
MUTED = colors.HexColor("#666A7D")
LINE = colors.HexColor("#DDD9E8")
PALE = colors.HexColor("#F5F3FA")


@dataclass
class Commit:
    full_hash: str
    date: str
    author: str
    subject: str
    paths: list[str]
    insertions: int
    deletions: int
    binary_files: int
    channels: list[str]


def run(*args: str) -> str:
    return subprocess.check_output(args, cwd=ROOT, text=True).strip()


def classify(path: str) -> str:
    if path.startswith("webprincipal/") or path == "scripts/deploy-webprincipal.sh":
        return "Web publica"
    if path.startswith("apps/admin/"):
        return "Sistema admin"
    if path.startswith("apps/mobile/"):
        return "Aplicacion movil"
    if path.startswith("apps/api/"):
        return "API y contenidos"
    if path.startswith(".github/") or path.startswith("sonar") or path == ".gitignore":
        return "Calidad e infraestructura"
    return "Soporte del repositorio"


def load_commits() -> list[Commit]:
    hashes = run(
        "git", "rev-list", "--reverse", f"--since={SINCE}", f"--until={UNTIL}", "HEAD"
    ).splitlines()
    commits: list[Commit] = []
    for commit_hash in hashes:
        meta = run(
            "git", "show", "-s", "--date=short", "--format=%ad%x1f%an%x1f%s", commit_hash
        ).split("\x1f", 2)
        paths_text = run("git", "diff-tree", "--no-commit-id", "--name-only", "-r", commit_hash)
        paths = [path for path in paths_text.splitlines() if path]
        numstat = run("git", "show", "--format=", "--numstat", commit_hash)
        insertions = deletions = binary_files = 0
        for row in numstat.splitlines():
            parts = row.split("\t", 2)
            if len(parts) != 3:
                continue
            if parts[0] == "-" or parts[1] == "-":
                binary_files += 1
            else:
                insertions += int(parts[0])
                deletions += int(parts[1])
        channels = sorted({classify(path) for path in paths})
        if not channels and ("sonar" in meta[2].lower() or "trigger" in meta[2].lower()):
            channels = ["Calidad e infraestructura"]
        commits.append(
            Commit(
                full_hash=commit_hash,
                date=meta[0],
                author=meta[1],
                subject=meta[2],
                paths=paths,
                insertions=insertions,
                deletions=deletions,
                binary_files=binary_files,
                channels=channels,
            )
        )
    return commits


DETAILS = {
    "e8b17767": "Mejoro la navegacion del administrador y la interfaz base; tambien actualizo la portada publica y configuracion general relacionada.",
    "88009f26": "Configuro Shorebird para actualizaciones OTA e incorporo WebView interactivo para recursos Canva y PowerPoint, con soporte del API.",
    "06ae98a4": "Incremento la aplicacion a v1.0.0+15 y mostro la version instalada al final de la pantalla de perfil.",
    "99650ff6": "Simplifico la creacion y edicion de cursos en el administrador mediante un flujo visual de una sola superficie.",
    "ecf754b3": "Refino la tarjeta de recursos del editor de cursos para mejorar jerarquia, legibilidad y consistencia visual.",
    "4d7029ff": "Corrigio la extraccion del identificador de modulo usada por la herramienta auxiliar del administrador.",
    "be68b32b": "Actualizo cursos simulados con portadas y enlaces reales de recursos Canva para validar el recorrido completo.",
    "08b55f7b": "Agrego reproduccion de video embebido y visualizacion PDF dentro del detalle del curso en movil.",
    "d583acee": "Integro Syncfusion PDF y completo el estado del selector de medios para alternar recursos sin salir del curso.",
    "b55304cd": "Corrigio la subida y normalizacion de medios entre administrador, API y aplicacion movil.",
    "57a1b557": "Corrigio la apertura de recursos del curso y armonizo el contrato consumido por administrador y movil.",
    "d1c2e8e1": "Expuso en la API los recursos asociados a cursos publicados para que estuvieran disponibles a clientes.",
    "b46d647d": "Enlazo automaticamente los archivos cargados con la leccion o recurso correspondiente en el administrador.",
    "aacd3c2d": "Redujo el formulario de curso nuevo y ordeno los datos esenciales del alta inicial.",
    "93c7a3f9": "Incorporo al repositorio los medios necesarios para cursos publicados y sus pruebas de visualizacion.",
    "4e64bfdd": "Corrigio reproduccion de video de cursos mediante ajustes coordinados en API y aplicacion movil.",
    "408a9537": "Mejoro Canva, imagenes y video en movil; agrego boton Publicar y pestana Modulos en el administrador.",
    "8441b40c": "Excluyo la carpeta de cargas del API del control de versiones para evitar publicar archivos operativos.",
    "167aa471": "Limpio cursos predeterminados antiguos y definio dos cursos base nuevos de tarot y astrologia.",
    "6b853013": "Uso un User-Agent especifico para Canva y sustituyo la portada negra durante carga por un estado visual adecuado.",
    "c76f9a7e": "Agrego lecciones de prueba con video e imagen al curso de astrologia para validar recursos mixtos.",
    "55afa466": "Actualizo la version visible del perfil movil al Build 16.",
    "ec9adc7a": "Configuro WKWebView en iOS para permitir reproduccion de video dentro de la aplicacion.",
    "1aea77e3": "Corrigio renderizado del editor de cursos y reorganizo su comportamiento responsive en distintos anchos.",
    "721037c7": "Agrego un workflow inicial de analisis de calidad con SonarQube.",
    "12756451": "Completo la configuracion de SonarQube/SonarCloud y preparo los distintos paquetes del monorepo para analisis.",
    "9873befc": "Genero una ejecucion del pipeline de SonarQube para comprobar la configuracion.",
    "1b710f1f": "Agrego la organizacion requerida por SonarCloud para autenticar y asociar el proyecto.",
    "42113aa4": "Ajusto el alcance del analisis para respetar el limite de lineas permitido por SonarCloud.",
    "c758e3bf": "Forzo una nueva ejecucion de SonarCloud sobre la rama principal.",
    "a536eb3a": "Excluyo archivos masivos de tienda del analisis para mantener el proyecto bajo el limite de 100 mil lineas.",
    "f753aad6": "Refino la superficie de autoria de cursos y su jerarquia visual dentro del administrador.",
    "2fd6a12b": "Alineo acciones y botones del flujo de cursos con la paleta oficial de la marca.",
    "ad66db0b": "Expuso el flujo completo de autoria: datos generales, modulos, lecciones, recursos y publicacion.",
    "9cac3d86": "Corrigio el menu de la portada para responder al desplazamiento y adaptarse correctamente a movil.",
    "1882800c": "Corrigio el destino de despliegue para servir la portada desde la raiz real de Nginx sin afectar API ni administrador.",
    "960976d5": "Agrego profundidad 3D, movimiento de iconos y una seccion destacada de tienda con imagen optimizada.",
    "7d66ca4e": "Compacto la experiencia movil con carruseles horizontales y reduccion de alturas y bloques redundantes.",
    "0301eb72": "Retiro la barra inferior movil por resultar invasiva, conservando carruseles y compactacion de secciones.",
}


CHANNEL_SUMMARIES = [
    (
        "Sistema admin",
        [
            "Reestructuracion del editor de cursos hacia un flujo coherente de datos generales, modulos, lecciones, recursos y publicacion.",
            "Correcciones de renderizado y responsive para evitar pantallas vacias, elementos montados y formularios fuera de orden.",
            "Mejoras de carga de archivos, enlace automatico de recursos y controles de publicacion.",
            "Ajustes visuales de tarjetas, acciones y paleta para mantener coherencia con la identidad de Lo Renaciente.",
        ],
    ),
    (
        "Aplicacion movil",
        [
            "Visualizacion interna de Canva/PowerPoint mediante WebView y manejo especifico de desafios de Cloudflare.",
            "Reproduccion embebida de video, soporte de PDF con Syncfusion y selector de medios dentro del curso.",
            "Correccion de portadas negras, estados de carga y acceso a recursos publicados.",
            "Soporte iOS para video inline, configuracion Shorebird OTA y actualizaciones de version visibles (Build 15 y 16).",
        ],
    ),
    (
        "API y contenidos",
        [
            "Exposicion de recursos publicados y normalizacion de archivos subidos para consumo web y movil.",
            "Correcciones coordinadas de video, imagenes y archivos vinculados a lecciones.",
            "Limpieza de cursos predeterminados y creacion de cursos base de tarot y astrologia.",
            "Incorporacion de contenido de prueba y medios publicados para validar recorridos de extremo a extremo.",
        ],
    ),
    (
        "Web publica",
        [
            "Menu responsive con ocultamiento al bajar, reaparicion al subir y correccion del desplazamiento movil.",
            "Despliegue corregido hacia la raiz real de Nginx sin borrar API, administrador ni APK compartidos.",
            "Tarjetas con profundidad 3D, iconos animados y bloque visual de tienda con recurso WebP optimizado.",
            "Experiencia movil compactada con carruseles; posterior retiro de la barra inferior por ser invasiva.",
        ],
    ),
    (
        "Calidad e infraestructura",
        [
            "Workflow de SonarQube/SonarCloud, organizacion del proyecto y ejecuciones de validacion.",
            "Ajuste de exclusiones y alcance para cumplir limites de analisis sin incluir archivos masivos.",
            "Exclusion de cargas operativas del API en Git para separar contenido del codigo fuente.",
        ],
    ),
]


def make_styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "Title", parent=base["Title"], fontName="Helvetica-Bold", fontSize=27,
            leading=32, textColor=CREAM, alignment=TA_LEFT, spaceAfter=10,
        ),
        "subtitle": ParagraphStyle(
            "Subtitle", parent=base["BodyText"], fontName="Helvetica", fontSize=11,
            leading=16, textColor=colors.HexColor("#D8D3E9"),
        ),
        "h1": ParagraphStyle(
            "H1", parent=base["Heading1"], fontName="Helvetica-Bold", fontSize=18,
            leading=22, textColor=NAVY, spaceBefore=4, spaceAfter=10,
        ),
        "h2": ParagraphStyle(
            "H2", parent=base["Heading2"], fontName="Helvetica-Bold", fontSize=13,
            leading=17, textColor=PURPLE, spaceBefore=10, spaceAfter=6,
        ),
        "body": ParagraphStyle(
            "Body", parent=base["BodyText"], fontName="Helvetica", fontSize=9.2,
            leading=13.2, textColor=INK, spaceAfter=6,
        ),
        "small": ParagraphStyle(
            "Small", parent=base["BodyText"], fontName="Helvetica", fontSize=7.8,
            leading=10.5, textColor=MUTED,
        ),
        "metric": ParagraphStyle(
            "Metric", parent=base["BodyText"], fontName="Helvetica-Bold", fontSize=20,
            leading=22, textColor=NAVY, alignment=TA_CENTER,
        ),
        "metric_label": ParagraphStyle(
            "MetricLabel", parent=base["BodyText"], fontName="Helvetica", fontSize=7.2,
            leading=9, textColor=MUTED, alignment=TA_CENTER,
        ),
        "commit_title": ParagraphStyle(
            "CommitTitle", parent=base["BodyText"], fontName="Helvetica-Bold", fontSize=9.2,
            leading=12, textColor=NAVY, spaceAfter=3,
        ),
        "commit_body": ParagraphStyle(
            "CommitBody", parent=base["BodyText"], fontName="Helvetica", fontSize=8.2,
            leading=11.3, textColor=INK, spaceAfter=2,
        ),
    }


def footer(canvas, doc):
    canvas.saveState()
    width, _ = A4
    canvas.setStrokeColor(LINE)
    canvas.line(18 * mm, 13 * mm, width - 18 * mm, 13 * mm)
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(18 * mm, 8.5 * mm, "Lo Renaciente - Registro de cambios 11-26 agosto 2026")
    canvas.drawRightString(width - 18 * mm, 8.5 * mm, f"Pagina {doc.page}")
    canvas.restoreState()


def metric_box(value: str, label: str, styles):
    return Table(
        [[Paragraph(value, styles["metric"])], [Paragraph(label, styles["metric_label"])]],
        colWidths=[38 * mm], rowHeights=[13 * mm, 12 * mm],
        style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.white),
            ("BOX", (0, 0), (-1, -1), 0.7, LINE),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ]),
    )


def bullet(text: str, styles):
    return Paragraph(f"<font color='#D9A04C'>-</font>&nbsp;&nbsp;{text}", styles["body"])


def channel_table(commits: list[Commit], styles):
    channel_order = [
        "Sistema admin", "Aplicacion movil", "API y contenidos", "Web publica",
        "Calidad e infraestructura", "Soporte del repositorio",
    ]
    commit_mentions = collections.Counter()
    touches = collections.Counter()
    unique = collections.defaultdict(set)
    for commit in commits:
        for channel in commit.channels:
            commit_mentions[channel] += 1
        for path in commit.paths:
            channel = classify(path)
            touches[channel] += 1
            unique[channel].add(path)
    rows = [[
        Paragraph("Canal", styles["small"]), Paragraph("Commits*", styles["small"]),
        Paragraph("Toques de archivo", styles["small"]), Paragraph("Archivos unicos", styles["small"]),
    ]]
    for channel in channel_order:
        rows.append([
            Paragraph(channel, styles["body"]), str(commit_mentions[channel]),
            str(touches[channel]), str(len(unique[channel])),
        ])
    table = Table(rows, colWidths=[76 * mm, 27 * mm, 37 * mm, 32 * mm], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), CREAM),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ALIGN", (1, 1), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.4, LINE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE]),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return table


def build_report():
    commits = load_commits()
    styles = make_styles()
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)

    unique_files = set()
    file_touches = insertions = deletions = binary_files = 0
    authors = collections.Counter()
    days = collections.Counter()
    for commit in commits:
        unique_files.update(commit.paths)
        file_touches += len(commit.paths)
        insertions += commit.insertions
        deletions += commit.deletions
        binary_files += commit.binary_files
        authors[commit.author] += 1
        days[commit.date] += 1

    doc = BaseDocTemplate(
        OUTPUT,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=17 * mm,
        bottomMargin=18 * mm,
        title="Reporte de cambios Lo Renaciente - 11 al 26 de agosto de 2026",
        author="Lo Renaciente",
        subject="Auditoria del historial Git por web, administrador, API y aplicacion movil",
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")
    doc.addPageTemplates([PageTemplate(id="report", frames=[frame], onPage=footer)])

    story = []

    cover = Table(
        [[
            Paragraph("REPORTE DE CAMBIOS", ParagraphStyle(
                "Eyebrow", parent=styles["small"], textColor=GOLD,
                fontName="Helvetica-Bold", fontSize=8.5, leading=11, spaceAfter=12,
            )),
        ], [
            Paragraph("Lo Renaciente", styles["title"]),
        ], [
            Paragraph("Web publica, sistema administrador, API y aplicacion movil", styles["subtitle"]),
        ], [
            Spacer(1, 14 * mm),
        ], [
            Paragraph("Periodo auditado", ParagraphStyle(
                "CoverLabel", parent=styles["small"], textColor=GOLD,
                fontName="Helvetica-Bold", fontSize=8,
            )),
        ], [
            Paragraph("Martes 11 de agosto - miercoles 26 de agosto de 2026", ParagraphStyle(
                "CoverDate", parent=styles["body"], textColor=CREAM,
                fontName="Helvetica-Bold", fontSize=12, leading=16,
            )),
        ]],
        colWidths=[doc.width],
        style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), NAVY),
            ("BOX", (0, 0), (-1, -1), 1.2, PURPLE),
            ("LEFTPADDING", (0, 0), (-1, -1), 18 * mm),
            ("RIGHTPADDING", (0, 0), (-1, -1), 18 * mm),
            ("TOPPADDING", (0, 0), (-1, 0), 18 * mm),
            ("BOTTOMPADDING", (0, -1), (-1, -1), 20 * mm),
        ]),
    )
    story.extend([cover, Spacer(1, 12 * mm)])

    metrics = Table(
        [[
            metric_box(str(len(commits)), "commits registrados", styles),
            metric_box(str(len(unique_files)), "archivos unicos", styles),
            metric_box(str(file_touches), "toques de archivo", styles),
            metric_box(f"{insertions + deletions:,}", "lineas afectadas", styles),
        ]],
        colWidths=[doc.width / 4] * 4,
        style=TableStyle([
            ("LEFTPADDING", (0, 0), (-1, -1), 2),
            ("RIGHTPADDING", (0, 0), (-1, -1), 2),
        ]),
    )
    story.extend([
        metrics,
        Spacer(1, 7 * mm),
        Paragraph(
            f"Se identificaron <b>{insertions:,} inserciones</b> y <b>{deletions:,} eliminaciones</b>. "
            f"El primer cambio registrado dentro del rango ocurrio el 12 de agosto; no hubo commits el dia 11.",
            styles["body"],
        ),
        Paragraph(
            "Documento generado a partir del historial Git de la rama principal. El conteo representa cambios "
            "versionados; acciones manuales no registradas en Git, configuraciones externas y datos creados "
            "directamente en produccion solo se reflejan cuando dejaron evidencia en un commit.",
            styles["small"],
        ),
        PageBreak(),
    ])

    story.extend([
        Paragraph("1. Resumen ejecutivo", styles["h1"]),
        Paragraph(
            "Durante el periodo se concentro el trabajo en estabilizar el ciclo completo de cursos: autoria "
            "en el administrador, almacenamiento y exposicion de recursos en el API, consumo de imagenes, "
            "PDF, Canva y video dentro de la aplicacion movil, y mejoras de navegacion y presentacion en la web publica.",
            styles["body"],
        ),
        channel_table(commits, styles),
        Spacer(1, 3 * mm),
        Paragraph(
            "* Un commit puede tocar varios canales. Por eso los subtotales por canal no deben sumarse para "
            "obtener 39. Los dos commits de activacion de SonarCloud no modificaron archivos, pero se cuentan "
            "como entregas de calidad e infraestructura.",
            styles["small"],
        ),
        Paragraph("Distribucion temporal", styles["h2"]),
    ])

    timeline_rows = [[Paragraph("Fecha", styles["small"]), Paragraph("Commits", styles["small"]), Paragraph("Foco principal", styles["small"])]]
    focus = {
        "2026-08-12": "Interfaz y navegacion administrativa",
        "2026-08-23": "Recursos de cursos, WebView, PDF, video y editor admin",
        "2026-08-24": "Publicacion, archivos, cursos base e iOS inline video",
        "2026-08-25": "Responsive admin, flujo de autoria y SonarCloud",
        "2026-08-26": "Web publica, despliegue, tienda 3D y experiencia movil",
    }
    for date in sorted(days):
        timeline_rows.append([date, str(days[date]), Paragraph(focus.get(date, "Cambios generales"), styles["body"])])
    timeline = Table(timeline_rows, colWidths=[34 * mm, 24 * mm, 114 * mm], repeatRows=1)
    timeline.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PURPLE),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.4, LINE),
        ("ALIGN", (1, 1), (1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE]),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.extend([timeline, Spacer(1, 4 * mm)])

    story.append(Paragraph("2. Cambios detallados por canal", styles["h1"]))
    for idx, (channel, items) in enumerate(CHANNEL_SUMMARIES, 1):
        channel_block = [Paragraph(f"2.{idx} {channel}", styles["h2"])]
        for item in items:
            channel_block.append(bullet(item, styles))
        story.append(KeepTogether(channel_block))

    story.extend([
        PageBreak(),
        Paragraph("3. Hallazgos transversales", styles["h1"]),
        Paragraph("3.1 Ciclo de cursos de extremo a extremo", styles["h2"]),
        Paragraph(
            "La mayor concentracion de trabajo estuvo en eliminar diferencias entre lo que el administrador "
            "creaba y lo que la aplicacion podia leer. Los cambios cubrieron carga, enlace automatico, publicacion, "
            "exposicion del API y renderizado en movil.",
            styles["body"],
        ),
        Paragraph("3.2 Recursos multimedia", styles["h2"]),
        Paragraph(
            "Se incorporaron rutas especificas para imagenes, PDF, Canva/PowerPoint y video. En iOS se habilito "
            "reproduccion inline y se corrigieron estados que mostraban portadas negras o bucles de preparacion.",
            styles["body"],
        ),
        Paragraph("3.3 Experiencia responsive", styles["h2"]),
        Paragraph(
            "El administrador recibio una reorganizacion responsive del editor. La web publica corrigio el menu "
            "durante desplazamiento, compacto secciones en movil mediante carruseles y retiro una barra inferior "
            "que resulto demasiado invasiva.",
            styles["body"],
        ),
        Paragraph("3.4 Operacion y calidad", styles["h2"]),
        Paragraph(
            "Se corrigio el destino de despliegue Nginx para la portada y se agrego analisis SonarCloud. Tambien "
            "se separaron cargas operativas y archivos masivos del control y analisis de codigo.",
            styles["body"],
        ),
        Paragraph("3.5 Autoria", styles["h2"]),
        Paragraph(
            "El historial atribuye 37 commits a CJ-4066 y 2 commits a marcpd28-png. Ambos autores utilizan el "
            "mismo correo configurado en Git dentro de este repositorio.",
            styles["body"],
        ),
        PageBreak(),
        Paragraph("4. Registro cronologico completo", styles["h1"]),
        Paragraph(
            "Los siguientes 39 registros constituyen la enumeracion completa de commits encontrados dentro del periodo.",
            styles["body"],
        ),
    ])

    for index, commit in enumerate(commits, 1):
        short_hash = commit.full_hash[:8]
        channels = ", ".join(commit.channels) if commit.channels else "Sin archivos modificados"
        path_preview = ", ".join(commit.paths[:4])
        if len(commit.paths) > 4:
            path_preview += f" y {len(commit.paths) - 4} mas"
        if not path_preview:
            path_preview = "Sin cambios de archivo; activacion del pipeline."
        stat = f"{len(commit.paths)} archivo(s) | +{commit.insertions} / -{commit.deletions}"
        if commit.binary_files:
            stat += f" | {commit.binary_files} binario(s)"
        block = [
            Paragraph(
                f"{index}. {commit.date} - {short_hash} - {commit.subject}",
                styles["commit_title"],
            ),
            Paragraph(f"<b>Canal(es):</b> {channels} &nbsp;&nbsp; <b>Impacto:</b> {stat}", styles["commit_body"]),
            Paragraph(DETAILS.get(short_hash, commit.subject), styles["commit_body"]),
            Paragraph(f"<b>Archivos:</b> {path_preview}", styles["small"]),
        ]
        card = Table(
            [[block]], colWidths=[doc.width],
            style=TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.white if index % 2 else PALE),
                ("BOX", (0, 0), (-1, -1), 0.45, LINE),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]),
        )
        story.extend([KeepTogether(card), Spacer(1, 2.4 * mm)])

    story.extend([
        Spacer(1, 4 * mm),
        Paragraph("5. Criterio de conteo y trazabilidad", styles["h1"]),
        bullet("Rango: 2026-08-11 00:00 a 2026-08-26 23:59, zona horaria America/Lima.", styles),
        bullet("Fuente: commits alcanzables desde HEAD de la rama principal al generar este documento.", styles),
        bullet("Cambio/entrega: un commit Git. Total del periodo: 39.", styles),
        bullet("Toque de archivo: una aparicion de un archivo dentro de un commit. Total: 110.", styles),
        bullet("Archivo unico: ruta distinta modificada al menos una vez. Total: 54.", styles),
        bullet(f"Volumen textual: {insertions:,} inserciones y {deletions:,} eliminaciones; los binarios no aportan conteo de lineas.", styles),
        bullet("Los subtotales por canal son inclusivos: un commit mixto aparece en cada canal que modifica.", styles),
        Spacer(1, 6 * mm),
        Paragraph(
            f"Generado el {datetime.now().strftime('%d/%m/%Y %H:%M')} a partir del repositorio local Lo Renaciente.",
            styles["small"],
        ),
    ])

    doc.build(story)
    print(OUTPUT)


if __name__ == "__main__":
    build_report()
