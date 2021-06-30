const fs = require("fs-extra");
const path = require("path");
const Dropbox = require("dropbox").Dropbox;

async function timerFired(s: Switch, flowElement: FlowElement) {
  try {
    await flowElement.log(LogLevel.Warning, 'timerFire');

    const App_Key = await flowElement.getPropertyStringValue("App_Key");
    const App_Secret = await flowElement.getPropertyStringValue("App_Secret");
    const refresh_Token = await flowElement.getPropertyStringValue("Token");
    const dropboxPathToFile = await flowElement.getPropertyStringValue(
      "Dropbox_path"
    );
    const refresh = await flowElement.getPropertyStringValue("Refresh");

    flowElement.setTimerInterval(parseInt(refresh+""));

    // new dropbox client
    const dbx = new Dropbox({
      clientId: App_Key,
      clientSecret: App_Secret,
      refreshToken: refresh_Token,
    });

    let files = await dbx
      .filesListFolder({ path: dropboxPathToFile })
      .then((response) =>
        response.result.entries.filter(
          (e) => e[".tag"] === "file" && e.is_downloadable
        )
      );

    files.forEach(async (file) => {
      // download it and create a job with its name
      const newJob = flowElement.createJob("");
      await dbx
        .filesDownload({ path: file.path_lower })
        .then(async (response) => {
          await flowElement.log(LogLevel.Warning, 'try to create %1 job',[response.result.name]);
         
         
         
          // const tmpjobPath = path.join(jobPath, response.result.name);
          // await fs.writeFile(tmpjobPath, response.result.fileBinary, "binary");


          // const newJob = await job.createChild(tmpjobPath.name);
          // newJob.sendToSingle();
        });

      // delete it from dropbox
      //await dbx.filesDeleteV2({ path: file.path_lower });
    });
  } catch (error) {
    flowElement.failProcess(
      "Something went wrong with the download : %1",
      JSON.stringify(error)
    );
  }
}
