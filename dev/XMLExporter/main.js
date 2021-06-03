"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = __importDefault(require("fs-extra"));
const tmp_1 = __importDefault(require("tmp"));
const XMLWriter = require('xml-writer');
async function jobArrived(s, flowElement, job) {
    try {
        const xw = new XMLWriter();
        xw.startDocument('1.0', 'UTF-8');
        xw.startElement('root');
        const datas = await job.getPrivateData();
        datas.forEach(data => {
            xw.startElement("item");
            xw.writeAttribute("name", data.tag);
            xw.text(data.value);
            xw.endElement();
        });
        // TODO : datasets
        // com.enfocus.PitStopServer.cli-taskreport
        const datasets = await job.listDatasets();
        if (datasets.length > 0) {
            xw.startElement('datasets');
            datasets.forEach(data => {
                xw.startElement("dataset");
                xw.writeAttribute("extension", data.extension);
                xw.writeAttribute("model", data.model);
                xw.text(data.name);
                xw.endElement();
            });
            xw.endElement();
        }
        xw.endElement().endDocument();
        const xml_temp = tmp_1.default.fileSync();
        fs_extra_1.default.writeFileSync(xml_temp.name, xw.toString());
        const xmlExport = job.getName().replace(".pdf", ".xml");
        const newJob = await job.createChild(xml_temp.name);
        await newJob.sendToSingle(xmlExport); //mise a dsipo du fichier genere dans la suite
        await job.sendToSingle(); //poursuite du job actuel
    }
    catch (e) {
        job.fail("Failed to process the job '%1': %2", [job.getName(), e.message]);
    }
}
//# sourceMappingURL=main.js.map