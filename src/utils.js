import fs from "fs";
import csv from "csv";
import Vue from "vue";
import crypto from "crypto";
import iconv from "iconv-lite";
import { Readable } from "stream";

function Counter(keys) {
  let counter = {};
  keys.forEach((key) => (counter[key] = (counter[key] || 0) + 1));
  return counter;
}

function debounce(callback, timeout) {
  let handle = null;
  return (...args) => {
    clearTimeout(handle);
    handle = setTimeout(() => {
      handle = null;
      callback(...args);
    }, timeout);
  };
}

function toastedShow(message, type = "success") {
  Vue.toasted.show(message, {
    duration: 2000,
    keepOnHover: true,
    closeOnSwipe: true,
    position: "top-center",
    type: type,
    icon: "fa-info-circle",
    iconPack: "fontawesome",
  });
}

function loadKeyValueCSV(filePath, checksum = false, encoding = "utf8") {
  return new Promise((resolve, reject) => {
    let string = "";
    let records = {};
    fs.createReadStream(filePath)
      .on("error", reject)
      .pipe(iconv.decodeStream(encoding))
      .on("error", reject)
      .on("data", (chunk) => {
        string += chunk;
        return chunk;
      })
      .pipe(csv.parse({ delimiter: ",", escape: "\\" }))
      .on("error", reject)
      .on("data", (row) => {
        records[row[0]] = row[1];
      })
      .on("finish", () => {
        if (checksum) {
          const md5 = crypto
            .createHash("md5")
            .update(
              string
                .split("\n")
                .slice(0, -2)
                .join("\n") + "\n"
            )
            .digest("hex");
          if (records["checksum"] === md5) {
            delete records["checksum"];
          } else {
            reject(
              "Cannot load " +
                filePath +
                ' since the checksum is not correct. Did you modify the file?"'
            );
          }
        }
        resolve(records);
      });
  });
}

function saveKeyValueCSV(
  filePath,
  object,
  checksum = false,
  encoding = "utf8"
) {
  let lines = [];

  for (const key in object) {
    let line = [
      key,
      '"' + object[key].toString().replace(/"/g, '\\"') + '"',
    ].join(",");
    lines.push(line);
  }

  let string = lines.join("\n") + "\n";

  if (checksum) {
    const md5 = crypto
      .createHash("md5")
      .update(string)
      .digest("hex");
    string += ["checksum", md5].join(",") + "\n";
  }

  return new Promise((resolve, reject) => {
    Readable.from([string])
      .pipe(iconv.decodeStream("utf8"))
      .pipe(iconv.encodeStream(encoding))
      .pipe(fs.createWriteStream(filePath))
      .on("finish", resolve)
      .on("error", reject);
  });
}

export { Counter, toastedShow, debounce, loadKeyValueCSV, saveKeyValueCSV };
