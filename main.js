import * as fs from "fs-extra";
import * as path from "path";


async function getFiles(dir, levels, currentLevel, files) {
  const items = await fs.readdir(dir);
  for (const item of items) {
    const itemPath = path.join(dir, item);
    const itemStat = await fs.stat(itemPath);
    if (itemStat.isDirectory() && currentLevel < levels) {
      await getFiles(itemPath, levels, currentLevel + 1, files);
    } else {
      files.push(itemPath);
    }
  }
  return files;
}

async function jobArrived(s , flowElement, job) {
  try {
    const jobPath = await job.get(AccessLevel.ReadOnly);
    if (job.isFile()) {
      await job.log(LogLevel.Warning, "The file '%1' cannot be dismantled", [job.getName()]);
      await job.sendToSingle();
    } else {
      const levelsValue = await flowElement.getPropertyStringValue("SubfolderLevels");
      const levels = parseInt(levelsValue.toString());
      const files = await getFiles(jobPath, levels, 1);
      await Promise.all(
        files.map(async (file) => {
            job.log("Coucou '%1': %2", [job.getName(), file])
        })
      );
      await job.sendToNull();
    }
  } catch (e) {
    job.fail("Failed to process the job '%1': %2", [job.getName(), e.message]);
  }
}