# backup-gitignored

Small utility to back up .gitignored files (secrets, configs, keys, etc.) in zip archive. When anything else is an overkill.

## Usage

Run `npx backup-gitignored`

```bash
npx backup-gitignored --help

Usage: backup-gitignored [options] [directory]

Small utility to back up .gitignored files

Arguments:
  directory                       Directory to get ignored files from, defaults to process.cwd()

Options:
  -v, --verbose                   Prints more information about what is being archived and where
  -o, --output <zipfile>          output archive name (default: "backup-ignored.zip")
  -i, --ignore-file <ignorefile>  File that contains minimatch patterns for files that should be ignored and not included in the backup. Put things like node_modules/ and dist/ here (default: ".backupignore")
  -h, --help                      display help for command
```

Example of `.backupignore` file:

```
**/*.generated.*
**/__generated__
**/node_modules
**/Pods/
**/dist/
**/build/
**/.DS_Store
**/*.log
```

## License

MIT
