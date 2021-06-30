const fs = require("fs-extra");
const path = require("path");
const Dropbox = require("dropbox").Dropbox;

async function jobArrived(s: Switch, flowElement: FlowElement, job: Job) {
  const jobPath = await job.get(AccessLevel.ReadOnly);
  const filename = job.getName(true);
  try {
    const App_Key = await flowElement.getPropertyStringValue("App_Key");
    const App_Secret = await flowElement.getPropertyStringValue("App_Secret");
    const refresh_Token = await flowElement.getPropertyStringValue("Token");
    const dropboxPathToFile = await flowElement.getPropertyStringValue(
      "Dropbox_path"
    );

    // new dropbox client
    const dbx = new Dropbox({
      clientId: App_Key,
      clientSecret: App_Secret,
      refreshToken: refresh_Token,
    });

    // grab the file content
    const content = await fs.readFile(jobPath, { encoding: "utf8" });

    // send it to Dropbox
    await dbx.filesUpload({
      path: dropboxPathToFile + filename,
      contents: content,
    });
    await job.log(LogLevel.Info, 'File "%1" upload in  "%2" ', [
      filename,
      String(dropboxPathToFile),
    ]);

    await job.sendToSingle(); 
  } catch (error) {
    await job.log(
      LogLevel.Error,
      "Something went wrong with the %1 upload  : %2",
      [filename, JSON.stringify(error)]
    );
    job.fail("Something went wrong with the '%1' upload", [filename]);
  }
}
