import fs from "fs";
import path from "path";

/**
 * Read a file (UTF-8 by default).
 * @param {string} filePath
 * @returns {Promise<string>}
 */
export const readFile = (filePath) => {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, "utf8", (err, data) => {
      if (err) return reject(err);
      resolve(data);
    });
  });
};

/**
 * Write data to a file.
 * @param {string} filePath
 * @param {string|object} data
 * @returns {Promise<void>}
 */
export const writeFile = (filePath, data) => {
  return new Promise((resolve, reject) => {
    const content = typeof data === "object" ? JSON.stringify(data, null, 2) : data;
    fs.writeFile(filePath, content, "utf8", (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
};

/**
 * Check if file exists.
 * @param {string} filePath
 * @returns {boolean}
 */
export const fileExists = (filePath) => {
  return fs.existsSync(filePath);
};

/**
 * Delete a file if it exists.
 * @param {string} filePath
 * @returns {Promise<void>}
 */
export const deleteFile = (filePath) => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) return resolve();
    fs.unlink(filePath, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
};
