/**
 * ! 文件太多了, 使用插件, VSCode 会卡死
 *
 * ! VSCode will be stuck if using the plugin, because there are too many files
 */

const path = require("path");
const fs = require("fs");

const currentDir = path.dirname(__filename);
const rootPath = path.join(currentDir, "..");
const dstDocsDir = path.join(rootPath, "docs/");
const dstCodeDir = path.join(rootPath, "code/");

function createMdFile(filePath, ext) {
  const mdPath = filePath;
  if (fs.existsSync(mdPath)) return;
  const { dir: mdDir, name: mdName } = path.parse(mdPath);
  if (!fs.existsSync(mdDir)) fs.mkdirSync(mdDir, { recursive: true });
  const baseName = mdName + ext;
  const content = `# ${baseName}\n\n`;
  return new Promise((resolve, reject) => {
    fs.writeFile(mdPath, content, (err) => {
      if (err) reject(err);
      resolve();
    });
  });
}

function walkFolder(folder, cb) {
  for (const name of getCurSubDirs(folder)) {
    const fullPath = path.join(folder, name);
    const msg = {
      type: "fold",
      name,
      fullPath,
    };
    cb(msg);
    walkFolder(fullPath, cb);
  }

  for (const name of getCurSubFiles(folder)) {
    const msg = {
      type: "file",
      name,
      fullPath: path.join(folder, name),
    };
    cb(msg);
  }

  function getCurSubDirs(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    return items
      .filter((item) => item.isDirectory())
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((item) => item.name);
  }

  function getCurSubFiles(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    return items
      .filter((item) => item.isFile())
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((item) => item.name);
  }
}

function generateSummary(mdDir, root) {
  const summaryPath = path.join(mdDir, "SUMMARY.md");
  const readmePath = path.join(mdDir, "README.md");
  const readmeLink = getLink(readmePath);
  const summary = fs.createWriteStream(summaryPath);
  summary.write(`- [:boat:](${readmeLink})\n`);

  walkFolder(mdDir, writeInSummary);

  summary.end();

  function writeInSummary(msg) {
    if (msg.type == "fold") {
      const relPath = path.relative(mdDir, msg.fullPath);
      const depth = relPath.split(path.sep).length;
      const tabs = (depth - 1) * 2;
      summary.write(`${" ".repeat(tabs)}- ${msg.name}\n`);
    } else if (msg.type == "file") {
      if (
        !msg.name.endsWith(".md") ||
        msg.name == "README.md" ||
        msg.name == "SUMMARY.md"
      )
        return;
      const relPath = path.relative(mdDir, msg.fullPath);
      const depth = relPath.split(path.sep).length;
      const tabs = (depth - 1) * 2;
      summary.write(
        `${" ".repeat(tabs)}- [${msg.name}](${getLink(msg.fullPath)})\n`
      );
    }
  }
  function getLink(filePath) {
    return "/" + path.relative(root, filePath).replace(/\\/g, "/");
  }
}

function generateDocs(mdDir, codeDir, root, ext) {
  walkFolder(codeDir, createDocs);
  function createDocs(msg) {
    if (msg.type == "file") {
      if (!msg.name.endsWith(ext)) return;
      const virtualPath = path
        .relative(codeDir, msg.fullPath)
        .slice(0, -ext.length);
      const mdPath = path.join(mdDir, virtualPath + ".md");
      createMdFile(mdPath, ext);
    }
  }
}

function generate(mdDir, codeDir, root, ext) {
  console.log("generate docs");
  generateDocs(mdDir, codeDir, root, ext);
  console.log("generate summary");
  generateSummary(mdDir, root);
  console.log("done");
}

generate(dstDocsDir, dstCodeDir, rootPath, ".lua");
