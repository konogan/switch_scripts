import fs from "fs-extra";
import tmp from 'tmp';
const XMLWriter = require('xml-writer');

async function jobArrived(s: Switch, flowElement: FlowElement, job: Job) {
    try {

        const xw = new XMLWriter();

        xw.startDocument('1.0', 'UTF-8');
        xw.startElement('root');

        const datas = await job.getPrivateData();

        datas.forEach(data => {
            xw.startElement("item")
            xw.writeAttribute("name",data.tag);
            xw.text(JSON.stringify(data.value));
            xw.endElement();
        });

        // TODO : datasets
        // com.enfocus.PitStopServer.cli-taskreport

        const datasets = await job.listDatasets();
        if (datasets.length >0) {
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

        const xml_temp = tmp.fileSync();
        fs.writeFileSync(xml_temp.name, xw.toString());
        const xmlExport = job.getName().replace(".pdf",".xml");
        const newJob = await job.createChild(xml_temp.name);
        await newJob.sendToSingle(xmlExport); //mise a dsipo du fichier genere dans la suite

        await job.sendToSingle(); //poursuite du job actuel

    } catch (e) {
        job.fail("Failed to process the job '%1': %2", [job.getName(), e.message]);
    }

}