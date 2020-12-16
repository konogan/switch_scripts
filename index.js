
const fs = require('fs-extra');
const xml2js = require('xml2js');
const PDFDocument = require('pdfkit');
const parser = new xml2js.Parser();

const default_font_size = 10
const title_font_size = 18

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

const date = jour + ' ' + time;

const errors_colors = ['#FF8800', '#FFD500', '#FFAA00', '#FFBB33', '#FFB366'];
const warings_colors = ['#FF8800', '#FFD500', '#FFAA00', '#FFBB33', '#FFB366'];

function m2p(mm) {
  // A4 reference :   width   595.28 point   height   841.89 point
  //                          210 mm                  297 mm
  // 2,834666 pt/mm
  return mm * 2.834666
}

function draw_line(doc, coord_x, coord_y, width) {
  try {
    doc
      .lineCap('butt')
      .moveTo(m2p(coord_x), m2p(coord_y))
      .lineTo(m2p(coord_x + width), m2p(coord_y))
      .lineWidth(1)
      .stroke("black");
  } catch (error) {
    console.log(error)
  }
}

function page_header(doc, texte = "", coord_x = 10, coord_y = 10, width = 190) {
  try {
    doc
      .fontSize(title_font_size)
      .text(texte, m2p(coord_x), m2p(coord_y))
      .fillOpacity(1)
      .fillAndStroke('black');
    draw_line(doc, coord_x, coord_y + 6, width)
    doc.fontSize(default_font_size)
    doc.moveDown();
  } catch (error) {
    console.log(error)
  }

}

function page_footer(doc, folio = 1, coord_x = 10, coord_y = 270
  , width = 190) {
  try {
    draw_line(doc, coord_x, coord_y, width)
    doc
      .fontSize(default_font_size)
      .fillOpacity(1)
      .fillAndStroke('black');
    doc.text(``, m2p(coord_x), m2p(coord_y + 1));
    doc.moveDown();
    doc.text(`${date}`, { align: 'center', width: m2p(width) })
    doc.text(`${folio}/2`, { align: 'right', width: m2p(width) })
    doc.image("./CMI_logo.png", m2p(coord_x), m2p(coord_y + 5), { width: m2p(30) });
  } catch (error) {
    console.log(error)
  }
}

function label_text(doc, label, txt = "") {
  doc
    .fontSize(default_font_size)
    .font('Times-Bold')
    .text(label, {
      continued: true
    })
    .font('Times-Roman')
    .text(txt, {
      continued: false
    });
  if (txt === "") {
    doc.moveDown()
  }
}

function display_informations(doc, infos, coord_y) {
  for (let index = 0; index < infos.length; index++) {
    const info = infos[index];
    doc.text("", m2p(10), m2p(coord_y))

    doc
      .fontSize(default_font_size)
      .font('Times-Bold')
      .text(Object.keys(info), m2p(10), m2p(coord_y))

    doc
      .fontSize(default_font_size)
      .font('Times-Roman')
      .text(Object.values(info), m2p(80), m2p(coord_y))

    coord_y += 5
  }

  return coord_y;
}


async function generate_report(preflight, vignette) {
  let xml = await fs.readFile(preflight);

  let jsonreport = await xml2js.parseStringPromise(xml, { trim: true, normalize: true, explicitArray: false, ignoreAttrs: false, mergeAttrs: true })
    .then(function (res) {
      return res["PreflightReport"]
    })
    .catch(function (err) {
      console.log('ça chie dans le ventilo')
    });

  // report
  const doc = new PDFDocument({ size: 'A4', margin: m2p(10) });
  doc.pipe(fs.createWriteStream('./output.pdf'));

  const today = new Date();
  const date = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()} ${today.getHours()}:${today.getMinutes()}:${today.getSeconds()}`

  const tw = parseInt(jsonreport['PageBoxes']['Trimbox']['width']);
  const th = parseInt(jsonreport['PageBoxes']['Trimbox']['height']);
  const tx = parseInt(jsonreport['PageBoxes']['Trimbox']['minX']);
  const ty = parseInt(jsonreport['PageBoxes']['Trimbox']['minY']);

  const bw = parseInt(jsonreport['PageBoxes']['Bleedbox']['width']);
  const bh = parseInt(jsonreport['PageBoxes']['Bleedbox']['height']);
  const bx = parseInt(jsonreport['PageBoxes']['Bleedbox']['minX']);
  const by = parseInt(jsonreport['PageBoxes']['Bleedbox']['minY']);

  const mw = parseInt(jsonreport['PageBoxes']['Mediabox']['width']);
  const mh = parseInt(jsonreport['PageBoxes']['Mediabox']['height']);
  const mx = parseInt(jsonreport['PageBoxes']['Mediabox']['minX']);
  const my = parseInt(jsonreport['PageBoxes']['Mediabox']['minY']);

  let infos = []
  if (jsonreport["PreflightProfile"] && jsonreport["PreflightProfile"] != "") {
    let p = {
      "Profil de preflight": jsonreport["PreflightProfile"]
    }
    infos.push(p)
  }
  if (jsonreport["Creator"] && jsonreport["Creator"] != "") {
    let p = {
      "Créateur": jsonreport["Creator"]
    }
    infos.push(p)
  }

  if (jsonreport["Inks"] && jsonreport["Inks"]['Ink']) {
    let p = {
      "Séparations utilisées dans le document": "(" + jsonreport["Inks"]['Ink'].length + ") " + jsonreport["Inks"]['Ink'].join(',')
    }
    infos.push(p)
  }

  if (jsonreport["DocumentName"] && jsonreport["DocumentName"] != "") {
    let p = {
      "Fichier": jsonreport["DocumentName"]
    }
    infos.push(p)
  }

  if (jsonreport["PDFVersion"] && jsonreport["PDFVersion"]["_"] != "") {
    let p = {
      "Version PDF": jsonreport["PDFVersion"]["_"]
    }
    infos.push(p)
  }

  if (jsonreport["datetime"] && jsonreport["datetime"] != "") {
    let p = {
      "Date de création": jsonreport["datetime"]
    }
    infos.push(p)
  }

  let boxes = []
  boxes.push({
    "TrimBox": ` ${tx}  mm  ${ty} mm (Dimension : ${tw} mm x ${th} mm)`
  })

  boxes.push({
    "BleedBox": ` ${bx}  mm  ${by} mm (Dimension : ${bw} mm x ${bh} mm)`
  })

  boxes.push({
    "MediaBox": ` ${mx}  mm  ${my} mm (Dimension : ${mw} mm x ${mh} mm)`
  })


  /**
   * PREMIERE PAGE
   */
  page_header(doc, "Rapport de preflight du document ")

  let last_y = display_informations(doc, infos, 30)

  last_y = display_informations(doc, boxes, last_y + 10)

  last_y += 30

  draw_line(doc, 10, last_y, 190)

  last_y += 5
  doc
    .fontSize(default_font_size)
    .font('Times-Bold')
    .text('Attention:', m2p(10), m2p(last_y))

  last_y += 10

  index_type_warn = 0
  jsonreport["Warnings"].forEach(warn => {
    doc.rect(m2p(10), m2p(last_y), m2p(3), m2p(3)).lineWidth(0.5).fillOpacity(0.5).fillAndStroke(warings_colors[index_type_warn], warings_colors[index_type_warn]);
    doc
      .fontSize(default_font_size)
      .font('Times-Roman')
      .fillAndStroke("#000")
      .fillOpacity(1)
      .text(warn['Message'], m2p(15), m2p(last_y))

    last_y += 10
    index_type_warn += 1
  });

  page_footer(doc, 1)


  /**
   * DEUXIEME PAGE
   */
  doc.addPage({ size: 'A4', margin: m2p(10) });

  // determine in facteur de reduction pour que la vignette s'affiche sur  190 de large
  ratio = 190 / mw;

  // la vignette on peut l'etirer pour quelle rentre dans la mediabox
  doc.image(vignette, m2p(10), m2p(10), { width: m2p(190), height: m2p(mh * ratio) });

  // les box couleurs acrobat
  doc.rect(m2p(10), m2p(10), m2p(mw * ratio), m2p(mh * ratio)).lineWidth(1).stroke("red");
  doc.rect(m2p(10) + m2p(bx * ratio), m2p(10) + m2p(by * ratio), m2p(bw * ratio), m2p(bh * ratio)).lineWidth(1).stroke("blue");
  doc.rect(m2p(10) + m2p(tx * ratio), m2p(10) + m2p(ty * ratio), m2p(tw * ratio), m2p(th * ratio)).lineWidth(1).stroke("green");

  // afficher les zones de Warning
  index_type_warn = 0
  index_loc = 0
  jsonreport["Warnings"].forEach(warn => {

    warn['Locations']['Location'].forEach(loc => {

      let x = parseFloat(loc["minX"]).toFixed(2);
      let y = parseFloat(mh - loc["maxY"]).toFixed(2);
      let w = parseFloat(loc["maxX"] - loc["minX"]).toFixed(2);
      let h = parseFloat((mh-loc["minY"]) - (mh-loc["maxY"])).toFixed(2);


      let rx = parseFloat(10 + x * ratio).toFixed(2); // on decale le point d'origne a 10 / 10 mm
      let ry = parseFloat(10 + y * ratio).toFixed(2); // on decale le point d'origne a 10 / 10 mm
      let rw = parseFloat(w * ratio).toFixed(2);
      let rh = parseFloat(h * ratio).toFixed(2);

      doc.rect(m2p(rx), m2p(ry), m2p(rw), m2p(rh)).lineWidth(0.5).fillOpacity(0.5).fillAndStroke(warings_colors[index_type_warn], warings_colors[index_type_warn]);

      index_loc +=1
    });
    index_type_warn += 1
  });

  page_footer(doc, 2)
  doc.end();
}

const report_file = "./report.xml";
const report_image = "./monimagedetest.jpg"

generate_report(report_file, report_image)


