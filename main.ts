import fs from "fs-extra";
import tmp from 'tmp';
import path from "path";
import xml2js from 'xml2js';
import getStream from "get-stream"
import PDFDocument from "pdfkit";

const parser = new xml2js.Parser();

async function jobArrived(s: Switch, flowElement: FlowElement, job: Job) {
    try {
        const jobPath = await job.get(AccessLevel.ReadOnly);
        const preflight_report = path.join(jobPath, job.getName() + '.xml');
        const preflight_preview = path.join(jobPath, job.getName() + '.jpg');

        await job.log(LogLevel.Info, "The preflight_report '%1' is arrived", [preflight_report]);
        await job.log(LogLevel.Info, "The preflight_preview '%1' is arrived", [preflight_preview]);

        const preflight_report_out = tmp.fileSync();

        await generate_report(preflight_report, preflight_preview, preflight_report_out.name, job);

        const newJob = await job.createChild(preflight_report_out.name);
        await newJob.sendToSingle(job.getName() + '.pdf')

        await job.log(LogLevel.Info, "The preflight transformation is available in %1", [job.getName() + '.pdf']);

        await job.sendToNull();

    } catch (e) {
        job.fail("Failed to process the job '%1': %2", [job.getName(), e.message]);
    }
}

const default_font_size = 10
const title_font_size = 18
const today = new Date();
let jour = today.toLocaleDateString("fr-FR", { year: "numeric", month: "2-digit", day: "2-digit" });
let time = today.toLocaleTimeString("fr-FR", { hour: "numeric", minute: "2-digit", second: "2-digit" });
const date = jour + ' ' + time;
const errors_colors = ['#FF8800', '#FFD500', '#FFAA00', '#FFBB33', '#FFB366'];
const warings_colors = ['#FF8800', '#FFD500', '#FFAA00', '#FFBB33', '#FFB366'];

function m2p(mm : number):number {
    return mm * 2.834666
}

function draw_line(doc: PDFDocument, coord_x: number, coord_y: number, width: number) {
    doc.lineCap('butt').moveTo(m2p(coord_x), m2p(coord_y)).lineTo(m2p(coord_x + width), m2p(coord_y)).lineWidth(1).stroke("black");
}

function page_header(doc :PDFDocument, texte = "", coord_x = 10, coord_y = 10, width = 190) {
    doc.fontSize(title_font_size).text(texte, m2p(coord_x), m2p(coord_y)).fillOpacity(1).fillAndStroke('black');
    draw_line(doc, coord_x, coord_y + 6, width)
    doc.fontSize(default_font_size)
    doc.moveDown();
}

function page_footer(doc : PDFDocument, folio = 1, coord_x = 10, coord_y = 270, width = 190) {
    draw_line(doc, coord_x, coord_y, width)
    doc.fontSize(default_font_size).fillOpacity(1).fillAndStroke('black');
    doc.text(``, m2p(coord_x), m2p(coord_y + 1));
    doc.moveDown();
    doc.text(`${date}`, { align: 'center', width: m2p(width) })
    doc.text(`${folio}/2`, { align: 'right', width: m2p(width) })
}

function display_informations(doc: PDFDocument, infos: any, coord_y: number) {
    for (let index = 0; index < infos.length; index++) {
        const info = infos[index];
        doc.text("", m2p(10), m2p(coord_y))
        doc.fontSize(default_font_size).font('Times-Bold').text(Object.keys(info), m2p(10), m2p(coord_y))
        doc.fontSize(default_font_size).font('Times-Roman').text(Object.values(info), m2p(80), m2p(coord_y))
        coord_y += 5
    }
    return coord_y;
}

async function generate_report(preflight: string, vignette: string, report: string, job: Job) {
    let xml = await fs.readFile(preflight);

    let jsonreport = await xml2js.parseStringPromise(xml, { trim: true, normalize: true, explicitArray: false, ignoreAttrs: false, mergeAttrs: true })
        .then(function (res : Object) {
            return res["PreflightReport"]
        })
        .catch(function (err : Error) {
            job.log(LogLevel.Warning, "Error during xml parsing : %1", [err.message]);
        });

    // report
    const doc = new PDFDocument({ size: 'A4', margin: m2p(10) })

    await job.log(LogLevel.Info, "Create report");

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
    infos.push({ "Profil de preflight": jsonreport["PreflightProfile"] ? jsonreport["PreflightProfile"] : "-" })
    infos.push({ "Créateur": jsonreport["Creator"] ? jsonreport["Creator"] : "-" })
    infos.push({ "Séparations utilisées dans le document": jsonreport["Inks"]['Ink'] ? "(" + jsonreport["Inks"]['Ink'].length + ") " + jsonreport["Inks"]['Ink'].join(',') : "-" })
    infos.push({ "Fichier": jsonreport["DocumentName"] ? jsonreport["DocumentName"] : "-" })
    infos.push({ "Version PDF": jsonreport["PDFVersion"]["_"] ? jsonreport["PDFVersion"]["_"] : "" })
    infos.push({ "Date de création": jsonreport["datetime"] ? jsonreport["datetime"] : "-" })

    let boxes = []
    boxes.push({ "TrimBox": ` ${tx}  mm  ${ty} mm (Dimension : ${tw} mm x ${th} mm)` })
    boxes.push({ "BleedBox": ` ${bx}  mm  ${by} mm (Dimension : ${bw} mm x ${bh} mm)` })
    boxes.push({ "MediaBox": ` ${mx}  mm  ${my} mm (Dimension : ${mw} mm x ${mh} mm)` })

    /**
     * PREMIERE PAGE
     */
    page_header(doc, "Rapport de preflight du document ")

    let last_y = display_informations(doc, infos, 30)
    last_y = display_informations(doc, boxes, last_y + 10)
    last_y += 30

    draw_line(doc, 10, last_y, 190)
    last_y += 5

    doc.fontSize(default_font_size).font('Times-Bold').text('Attention:', m2p(10), m2p(last_y))
    last_y += 10

    let index_type_warn = 0
    jsonreport["Warnings"].forEach(warn => {
        doc.rect(m2p(10), m2p(last_y), m2p(3), m2p(3)).lineWidth(0.5).fillOpacity(0.5).fillAndStroke(warings_colors[index_type_warn], warings_colors[index_type_warn]);
        doc.fontSize(default_font_size).font('Times-Roman').fillAndStroke("#000").fillOpacity(1).text(warn['Message'], m2p(15), m2p(last_y))
        last_y += 10
        index_type_warn += 1
    });
    page_footer(doc, 1)

    /**
     * DEUXIEME PAGE
     */
    doc.addPage({ size: 'A4', margin: m2p(10) });

    // determine in facteur de reduction pour que la vignette s'affiche sur  190 de large
    let ratio = 190 / mw;

    // la vignette on peut l'etirer pour quelle rentre dans la mediabox
    doc.image(vignette, m2p(10), m2p(10), { width: m2p(190), height: m2p(mh * ratio) });

    // les box couleurs acrobat
    doc.rect(m2p(10), m2p(10), m2p(mw * ratio), m2p(mh * ratio)).lineWidth(1).stroke("red");
    doc.rect(m2p(10) + m2p(bx * ratio), m2p(10) + m2p(by * ratio), m2p(bw * ratio), m2p(bh * ratio)).lineWidth(1).stroke("blue");
    doc.rect(m2p(10) + m2p(tx * ratio), m2p(10) + m2p(ty * ratio), m2p(tw * ratio), m2p(th * ratio)).lineWidth(1).stroke("green");

    // afficher les zones de Warning
    index_type_warn = 0
    let index_loc = 0
    jsonreport["Warnings"].forEach(warn => {
        warn['Locations']['Location'].forEach(loc => {
            let x = (loc["minX"]);
            let y = (mh - loc["maxY"]);
            let w = (loc["maxX"] - loc["minX"]);
            let h = ((mh - loc["minY"]) - (mh - loc["maxY"]));
            let rx = (10 + x * ratio); // on decale le point d'origne a 10 / 10 mm
            let ry = (10 + y * ratio); // on decale le point d'origne a 10 / 10 mm
            let rw = (w * ratio);
            let rh = (h * ratio);
            doc.rect(m2p(rx), m2p(ry), m2p(rw), m2p(rh)).lineWidth(0.5).fillOpacity(0.5).fillAndStroke(warings_colors[index_type_warn], warings_colors[index_type_warn]);
            index_loc += 1
        });
        index_type_warn += 1
    });
    page_footer(doc, 2)
    doc.end()

    await job.log(LogLevel.Info, "End report");
    let content = await getStream.buffer(doc)
    await job.log(LogLevel.Info, "Save report");
    await fs.writeFile(report, content);
}
