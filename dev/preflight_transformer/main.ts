import fs from "fs-extra";
import tmp from "tmp";
import path from "path";
import xml2js from "xml2js";
import getStream from "get-stream";
import PDFDocument from "pdfkit";

async function jobArrived(s: Switch, flowElement: FlowElement, job: Job) {
  try {
    const jobPath = await job.get(AccessLevel.ReadOnly);
    const preflight_report = path.join(jobPath, job.getName() + ".xml");
    const preflight_preview = path.join(jobPath, job.getName() + ".jpg");

    await job.log(LogLevel.Info, "The preflight_report '%1' is arrived", [
      preflight_report,
    ]);
    await job.log(LogLevel.Info, "The preflight_preview '%1' is arrived", [
      preflight_preview,
    ]);

    const preflight_report_out = tmp.fileSync();

    await generate_report(
      preflight_report,
      preflight_preview,
      preflight_report_out.name,
      job
    );

    const newJob = await job.createChild(preflight_report_out.name);
    await newJob.sendToSingle(job.getName() + ".pdf");

    await job.log(
      LogLevel.Info,
      "The preflight transformation is available in %1",
      [job.getName() + ".pdf"]
    );

    await job.sendToNull();
  } catch (e) {
    job.fail("Failed to process the job '%1': %2", [job.getName(), e.message]);
  }
}

const default_font_size = 10;
const title_font_size = 18;
const today = new Date();
let jour = today.toLocaleDateString("fr-FR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
let time = today.toLocaleTimeString("fr-FR", {
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
});
const date = jour + " " + time;
const errors_colors = [
  "#E32636",
  "#C7212F",
  "#AA1D29",
  "#E32636",
  "#E7414F",
  "#EA5C68",
  "#EE7781",
  "#F1939B",
  "#F5AEB4",
  "#F8C9CD",
  "#FCE4E6",
];
const warnings_colors = [
  "#FF7E00",
  "#FF8E20",
  "#FF9E40",
  "#FFAE60",
  "#FFBF80",
  "#FFCF9F",
  "#FFDFBF",
  "#FFEFDF",
  "#FFEFDF",
  "#FFEFDF",
  "#FFEFDF",
];

function m2p(mm: number): number {
  return mm * 2.834666;
}

function draw_line(doc, coord_x, coord_y, width) {
  doc
    .lineCap("butt")
    .moveTo(m2p(coord_x), m2p(coord_y))
    .lineTo(m2p(coord_x + width), m2p(coord_y))
    .lineWidth(1)
    .stroke("black");
}

function page_header(doc, texte = "", coord_x = 10, coord_y = 10, width = 190) {
  doc
    .fontSize(title_font_size)
    .text(texte, m2p(coord_x), m2p(coord_y))
    .fillOpacity(1)
    .fillAndStroke("black");
  draw_line(doc, coord_x, coord_y + 6, width);
  doc.fontSize(default_font_size);
  doc.moveDown();
}

function page_footer(doc, folio = 1, coord_x = 10, coord_y = 270, width = 190) {
  draw_line(doc, coord_x, coord_y, width);
  doc.fontSize(default_font_size).fillOpacity(1).fillAndStroke("black");
  doc.text(`${date}  - ${folio}/2`, m2p(10), m2p(coord_y) + 10);
  doc.image(
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAAAuCAYAAAAWYZTNAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyVpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTQ4IDc5LjE2NDAzNiwgMjAxOS8wOC8xMy0wMTowNjo1NyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIDIxLjAgKE1hY2ludG9zaCkiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6MEVENjk4ODMzQjYyMTFFQUEwNzc5N0M0ODcwQTdGQkUiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6MEVENjk4ODQzQjYyMTFFQUEwNzc5N0M0ODcwQTdGQkUiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDowRUQ2OTg4MTNCNjIxMUVBQTA3Nzk3QzQ4NzBBN0ZCRSIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDowRUQ2OTg4MjNCNjIxMUVBQTA3Nzk3QzQ4NzBBN0ZCRSIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PnRvWCYAAAu7SURBVHja7F0L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",
    m2p(coord_x + 150),
    m2p(coord_y + 10),
    { width: m2p(30) }
  );
}

function display_informations(doc, infos, coord_y) {
  for (let index = 0; index < infos.length; index++) {
    const info = infos[index];
    doc.text("", m2p(10), m2p(coord_y + 20));
    doc
      .fontSize(default_font_size)
      .font("Times-Bold")
      .text(`${Object.keys(info)[0]}`, m2p(10), m2p(coord_y));
    doc
      .fontSize(default_font_size)
      .font("Times-Roman")
      .text(`${Object.values(info)[0]}`, m2p(80), m2p(coord_y));
    coord_y += 5;
  }
  return coord_y;
}

async function generate_report(
  preflight: string,
  vignette: string,
  report: string,
  job: Job
) {
  let xml = await fs.readFile(preflight);
  let jsonreport = await xml2js
    .parseStringPromise(xml, {
      trim: true,
      normalize: true,
      explicitArray: false,
      ignoreAttrs: false,
      mergeAttrs: true,
    })
    .then(function (res) {
      return res["PreflightReport"];
    })
    .catch(function (err) {
      console.log(err);
    });

  // report
  const doc = new PDFDocument({ size: "A4", margin: m2p(10) });

  await job.log(LogLevel.Info, "Create report");

  const today = new Date();
  const date = `${today.getDate()}/${
    today.getMonth() + 1
  }/${today.getFullYear()} ${today.getHours()}:${today.getMinutes()}:${today.getSeconds()}`;

  // Media > Bleed > Trim
  // on part du principe que les box sont centrées les unes / autres

  // Boxes sizes
  const mw = parseInt(jsonreport["PageBoxes"]["Mediabox"]["width"]);
  const mh = parseInt(jsonreport["PageBoxes"]["Mediabox"]["height"]);
  const bw = parseInt(jsonreport["PageBoxes"]["Bleedbox"]["width"]);
  const bh = parseInt(jsonreport["PageBoxes"]["Bleedbox"]["height"]);
  const tw = parseInt(jsonreport["PageBoxes"]["Trimbox"]["width"]);
  const th = parseInt(jsonreport["PageBoxes"]["Trimbox"]["height"]);

  // Offsets
  const mx = 0;
  const my = 0;
  const bx = (mw-bw)/2;
  const by = (mh-bh)/2;
  const tx = (mw-tw)/2;
  const ty = (mh-th)/2;

  let infos = [];
  infos.push({
    "Profil de preflight": jsonreport["PreflightProfile"]
      ? jsonreport["PreflightProfile"]
      : "-",
  });
  infos.push({ Créateur: jsonreport["Creator"] ? jsonreport["Creator"] : "-" });
  infos.push({
    "Séparations utilisées dans le document": jsonreport["Inks"]["Ink"]
      ? "(" +
        jsonreport["Inks"]["Ink"].length +
        ") " +
        jsonreport["Inks"]["Ink"].join(",")
      : "-",
  });
  infos.push({
    Fichier: jsonreport["DocumentName"] ? jsonreport["DocumentName"] : "-",
  });
  infos.push({
    "Version PDF": jsonreport["PDFVersion"]["_"]
      ? jsonreport["PDFVersion"]["_"]
      : "",
  });
  infos.push({
    "Date de création": jsonreport["datetime"] ? jsonreport["datetime"] : "-",
  });

  let boxes = [];
  boxes.push({
    TrimBox: ` ${tx}  mm  ${ty} mm (Dimension : ${tw} mm x ${th} mm)`,
  });
  boxes.push({
    BleedBox: ` ${bx}  mm  ${by} mm (Dimension : ${bw} mm x ${bh} mm)`,
  });
  boxes.push({
    MediaBox: ` ${mx}  mm  ${my} mm (Dimension : ${mw} mm x ${mh} mm)`,
  });

  /**
   * PREMIERE PAGE
   */
  page_header(doc, "Rapport de preflight du document ");

  let last_y = display_informations(doc, infos, 30);
  last_y = display_informations(doc, boxes, last_y + 10);
  last_y += 30;

  draw_line(doc, 10, last_y, 190);
  last_y += 5;

  function writeMessage(message, color) {
    doc
      .rect(m2p(10), m2p(last_y), m2p(3), m2p(3))
      .lineWidth(0.5)
      .fillOpacity(0.5)
      .fillAndStroke(color, color);

    doc
      .fontSize(default_font_size)
      .font("Times-Roman")
      .fillAndStroke("#000")
      .fillOpacity(1)
      .text(message, m2p(15), m2p(last_y));

    last_y += 10;
  }

  // afficher les zones
  function drawLocations(locations, color) {
    if (locations["Location"]) {
      if (Array.isArray(locations["Location"])) {
        locations["Location"].forEach((loc) => {
          drawLocation(loc, color);
        });
      } else {
        drawLocation(locations["Location"], color);
      }
    }
  }

  function drawLocation(loc, color) {
    // the coodinates system is bottom/left
    // we translate to a top/left
    let x = parseInt(loc["minX"]);        // no change
    let y = mh - parseInt(loc["maxY"]);   // revert Y
    // Apply offest based on Trim
     x = x+tx;
     y = y-ty;
    let w = parseInt(loc["maxX"]) - parseInt(loc["minX"]);
    let h = parseInt(loc["maxY"]) - parseInt(loc["minY"]);

    // apply Ratio for drawing
    let rx = x * ratio;
    let ry = y * ratio;
    let rw = w * ratio;
    let rh = h * ratio;

    // starting point at 10 / 10 mm
    doc
      .rect(
        m2p(10) + m2p(rx),
        m2p(10) + m2p(ry),
        m2p(rw),
        m2p(rh))
      .lineWidth(0.5)
      .fillOpacity(0.5)
      .fillAndStroke(color, color);
  }

  if (jsonreport["Warnings"]) {
    let index_type_warn = 0;
    if (Array.isArray(jsonreport["Warnings"])) {
      doc
        .fontSize(default_font_size)
        .font("Times-Bold")
        .text("Warnings :", m2p(10), m2p(last_y));

      last_y += 10;

      jsonreport["Warnings"].forEach((warn) => {
        writeMessage(warn["Message"], warnings_colors[index_type_warn % 11]);
        index_type_warn++;
      });
    } else if (jsonreport["Warnings"]["Message"]) {
      doc
        .fontSize(default_font_size)
        .font("Times-Bold")
        .text("Warning:", m2p(10), m2p(last_y));

      last_y += 10;

      writeMessage(
        jsonreport["Warnings"]["Message"],
        warnings_colors[index_type_warn % 11]
      );
    }
  }

  if (jsonreport["Errors"]) {
    let index_type_err = 0;
    if (Array.isArray(jsonreport["Errors"])) {
      doc
        .fontSize(default_font_size)
        .font("Times-Bold")
        .text("Erreurs :", m2p(10), m2p(last_y));
      last_y += 10;
      jsonreport["Errors"].forEach((err) => {
        writeMessage(err["Message"], errors_colors[index_type_err % 11]);
        index_type_err++;
      });
    } else if (jsonreport["Errors"]["Message"]) {
      doc
        .fontSize(default_font_size)
        .font("Times-Bold")
        .text("Erreur:", m2p(10), m2p(last_y));
      last_y += 10;
      writeMessage(
        jsonreport["Errors"]["Message"],
        errors_colors[index_type_err % 11]
      );
    }
  }

  page_footer(doc, 1);

  /**
   * DEUXIEME PAGE
   */
  doc.addPage({ size: "A4", margin: m2p(10) });

  // determine in facteur de reduction pour que la vignette s'affiche sur  190 de large
  let ratio = 190 / mw;

  // la vignette on peut l'etirer pour quelle rentre dans la mediabox
  doc.image(vignette, m2p(10), m2p(10), {
    width: m2p(190),
    height: m2p(mh * ratio),
  });

  // les box couleurs acrobat
  doc
    .rect(m2p(10), m2p(10), m2p(mw * ratio), m2p(mh * ratio))
    .lineWidth(1)
    .stroke("black");

  doc
    .rect(
      m2p(10) + m2p(bx * ratio),
      m2p(10) + m2p(by * ratio),
      m2p(bw * ratio),
      m2p(bh * ratio)
    )
    .lineWidth(1)
    .stroke("blue");

  doc
    .rect(
      m2p(10) + m2p(tx * ratio),
      m2p(10) + m2p(ty * ratio),
      m2p(tw * ratio),
      m2p(th * ratio)
    )
    .lineWidth(1)
    .stroke("green");

  //   doc
  //     .rect(m2p(10), m2p(10), m2p(50), m2p(50))
  //     .lineWidth(0.5)
  //     .fillOpacity(0.5)
  //     .fillAndStroke("#FF7E00", "#FF7E00");

  if (jsonreport["Warnings"]) {
    let index_type_warn = 0;
    if (Array.isArray(jsonreport["Warnings"])) {
      jsonreport["Warnings"].forEach((warn) => {
        drawLocations(warn["Locations"], warnings_colors[index_type_warn % 11]);
        index_type_warn++;
      });
    } else if (jsonreport["Warnings"]["Message"]) {
      drawLocations(
        jsonreport["Warnings"]["Locations"],
        warnings_colors[index_type_warn % 11]
      );
    }
  }

  if (jsonreport["Errors"]) {
    let index_type_err = 0;
    if (Array.isArray(jsonreport["Errors"])) {
      jsonreport["Errors"].forEach((warn) => {
        drawLocations(warn["Locations"], errors_colors[index_type_err % 11]);
        index_type_err++;
      });
    } else if (jsonreport["Errors"]["Message"]) {
      drawLocations(
        jsonreport["Errors"]["Locations"],
        errors_colors[index_type_err % 11]
      );
    }
  }

  page_footer(doc, 2);
  doc.end();

  await job.log(LogLevel.Info, "End report");
  let content = await getStream.buffer(doc);
  await job.log(LogLevel.Info, "Save report");
  await fs.writeFile(report, content);
}
