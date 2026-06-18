/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import * as core from "@actions/core";
import * as glob from "@actions/glob";
import * as fs from "fs";
import { relative } from "path";
import * as process from "process";
import * as report from "./report.js";

async function main(): Promise<void> {
    core.startGroup("⚙ Setting up");
    const reports = core.getInput("reports", { required: true });
    core.endGroup();

    core.startGroup("📚 Reading reports");
    const globber = await glob.create(reports);
    const files = await globber.glob();
    const readReports: report.Report[] = [];

    for (const filePath of files) {
        const text = fs.readFileSync(filePath, { encoding: "utf-8" });
        readReports.push(report.readReport(text));
    }
    core.endGroup();

    core.startGroup("📑 Resolving files");
    const reportFiles: report.File[] = [];

    for (const report of readReports) {
        reportFiles.push(...resolveFiles(report));
    }
    core.endGroup();

    core.startGroup("✏ Annotating files");
    for (const file of reportFiles) {
        const fileName = relativise(file.name);

        for (const error of file.errors) {
            const annotation: core.AnnotationProperties = {
                file: fileName,
                startLine: error.line,
            };

            if (error.column != null) {
                annotation.startColumn = error.column;
            }

            let message = error.message;

            if (error.priority != null) {
                message += " (priority " + error.priority + ")";
            }

            switch (error.severity) {
                case report.SeverityLevel.Error:
                    core.error(message, annotation);
                    break;
                case report.SeverityLevel.Warning:
                    core.warning(message, annotation);
                    break;
                case report.SeverityLevel.Info:
                    core.notice(message, annotation);
                    break;
            }
        }
    }
    core.endGroup();
}

function resolveFiles(report: report.Report): report.File[] {
    const resolvedFiles: report.File[] = [];

    fileLoop: for (const file of report.files) {
        if (file.unresolved) {
            const candidates: string[] = [];
            const shortFilePath = file.package ? file.package + "/" + file.name : file.name;
            console.log("Resolving " + shortFilePath);

            for (const srcDir of report.sourceDirectories) {
                const candidate = srcDir + "/" + shortFilePath;

                if (fs.existsSync(candidate)) {
                    candidates.push(candidate);
                }
            }

            if (candidates.length > 1) {
                // Try to find the correct file based on the errors.
                outer: for (const candidate of candidates) {
                    const fileContents = fs.readFileSync(candidate, { encoding: "utf-8" });
                    const lines = fileContents.split("\n");

                    for (const error of file.errors) {
                        if (!error.sourceLine) continue; // can't match on undefined
                        if (error.line - 1 >= lines.length) continue outer; // failed match: file too short
                        const lineText = lines[error.line - 1];
                        if (!lineText.includes(error.sourceLine)) continue outer; // failed match: source line not found
                    }

                    // All checks succeeded, add resolved file
                    console.log("Candidate matched all errors: " + candidate);
                    resolvedFiles.push({
                        name: candidate,
                        package: "",
                        unresolved: false,
                        errors: file.errors,
                    });
                    continue fileLoop;
                }

                // Didn't find a file based on the errors, add first one.
                console.log("No candidate matched, falling back to first: " + candidates[0]);
                resolvedFiles.push({
                    name: candidates[0],
                    package: "",
                    unresolved: false,
                    errors: file.errors,
                });
            } else if (candidates.length == 1) {
                console.log("Found single candidate: " + candidates[0]);
                resolvedFiles.push({
                    name: candidates[0],
                    package: "",
                    unresolved: false,
                    errors: file.errors,
                });
            } else {
                console.log("Could not resolve file " + shortFilePath);
            }
        } else {
            resolvedFiles.push(file);
        }
    }

    return resolvedFiles;
}

function relativise(path: string): string {
    return relative(process.cwd(), path);
}

main().catch((e: Error) => {
    core.setFailed(e);
});
