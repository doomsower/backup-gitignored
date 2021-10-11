#!/usr/bin/env node

import chalk from 'chalk';
import { Command } from 'commander';
import ignore from 'ignore';
import JSZip from 'jszip';
import { createWriteStream, readFileSync } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, resolve as pathResolve, dirname } from 'node:path';
import { URL } from 'node:url';
import type { CleanOptions } from 'simple-git';
import simpleGit from 'simple-git';

const program = new Command();
const git = simpleGit();

const __dirname = dirname(new URL(import.meta.url).pathname);
const VERSION = JSON.parse(
  readFileSync(pathResolve(__dirname, '../package.json'), 'utf8'),
).version;

interface ProgramOptions {
  output: string;
  ignoreFile: string;
  verbose?: boolean;
  dryRun?: boolean;
}

async function writeZip(filename: string, zip: JSZip): Promise<string> {
  const zipFile = filename.endsWith('.zip') ? filename : `${filename}.zip`;
  return new Promise((resolve, reject) => {
    zip
      .generateNodeStream({
        compression: 'STORE',
        type: 'nodebuffer',
        streamFiles: true,
      })
      .pipe(createWriteStream(zipFile))
      .on('finish', () => {
        resolve(pathResolve(zipFile));
      })
      .on('error', (e) => {
        reject(e);
      });
  });
}

async function addToZip(
  path: string,
  zip: JSZip,
  options: ProgramOptions,
): Promise<void> {
  const { verbose, dryRun } = options;
  const stats = await stat(path);
  if (stats.isDirectory()) {
    const contents = await readdir(path);
    for (const inner of contents) {
      await addToZip(join(path, inner), zip, options);
    }
  } else {
    if (!dryRun) {
      const buf = await readFile(path);
      zip.file(path, buf, { binary: true, createFolders: true });
    }
    if (verbose || dryRun) {
      const prefix = dryRun ? 'Will add' : 'Added';
      console.info(`${prefix} ${chalk.green(path)}`);
    }
  }
}

async function filterIgnored(
  ignoreFile: string,
  paths: string[],
): Promise<string[]> {
  const ig = ignore();
  try {
    const ignoreList = await readFile(ignoreFile, { encoding: 'utf-8' });
    ig.add(ignoreList);
  } catch (e) {
    if (e.code !== 'ENOENT') {
      console.error(e);
    }
  }
  return ig.filter(paths);
}

program
  .description('Small utility to back up .gitignored files')
  .version(VERSION)
  .argument(
    '[directory]',
    'Directory to get ignored files from, defaults to process.cwd()',
  )
  .option(
    '-v, --verbose',
    'Prints more information about what is being archived and where',
  )
  .option('-o, --output <zipfile>', 'output archive name', 'backup-ignored.zip')
  .option(
    '-i, --ignore-file <ignorefile>',
    'File that contains minimatch patterns for files that should be ignored and not included in the backup. Put things like node_modules/ and dist/ here',
    '.backupignore',
  )
  .option('-d, --dry-run', 'Does not create the actual archive')
  .action(async (directory: string | undefined, options: ProgramOptions) => {
    const dir = directory ?? process.cwd();

    const clean = await git.clean(
      [
        'n', // CleanOptions.DRY_RUN,
        'd', // CleanOptions.RECURSIVE,
        'x', // CleanOptions.IGNORED_INCLUDED,
      ] as CleanOptions[],
      [dir],
    );
    const content = await filterIgnored(options.ignoreFile, clean.paths);
    const zip = new JSZip();
    for (const path of content) {
      await addToZip(path, zip, options);
    }
    if (!options.dryRun) {
      try {
        const zipFile = await writeZip(options.output, zip);
        if (options.verbose) {
          console.info(`\nCreated ${chalk.blue(zipFile)}`);
        }
      } catch (e) {
        console.error(e);
      }
    }
  });

program.parse(process.argv);
