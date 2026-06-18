/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { XmlDocument } from "xmldoc";

export enum SeverityLevel {
    Ignore = "ignore",
    Info = "info",
    Warning = "warning",
    Error = "error",
}

export interface File {
    name: string;
    package: string;
    unresolved: boolean;
    errors: Error[];
}

export interface Error {
    line: number;
    column: number | null;
    severity: SeverityLevel; // Checkstyle severity
    priority: string | null; // CodeNarc priority
    message: string;
    sourceLine: string | undefined;
}

export interface Report {
    files: File[];
    sourceDirectories: Set<string>;
}

export function readReport(xml: string): Report {
    const files: File[] = [];
    const sourceDirectories: Set<string> = new Set();
    const doc = new XmlDocument(xml);

    if (doc.name == "checkstyle") {
        doc.eachChild(child => {
            if (child.name != "file") return;

            const fileName = child.attr["name"];
            const errors: Error[] = child.childrenNamed("error").map(errorXml => {
                const line = Number.parseInt(errorXml.attr["line"]);
                const severity = errorXml.attr["severity"] as SeverityLevel;
                const message = errorXml.attr["message"];
                const columnAttr = errorXml.attr["column"];
                const column = columnAttr != null ? Number.parseInt(columnAttr) : null;
                return {
                    line,
                    column,
                    severity,
                    message,
                    priority: null,
                    sourceLine: undefined,
                };
            });

            if (errors.length > 0) {
                console.log("Errors in " + fileName, errors);
                files.push({
                    name: fileName,
                    package: "",
                    errors,
                    unresolved: false,
                });
            }
        });
    } else if (doc.name == "CodeNarc") {
        for (const project of doc.childrenNamed("Project")) {
            for (const dir of project.childrenNamed("SourceDirectory")) {
                sourceDirectories.add(dir.val);
            }
        }

        for (const pkg of doc.childrenNamed("Package")) {
            const packagePath = pkg.attr["path"];

            for (const file of pkg.childrenNamed("File")) {
                const fileName = file.attr["name"];
                const errors: Error[] = [];

                for (const violation of file.childrenNamed("Violation")) {
                    const ruleName = violation.attr["ruleName"];
                    const priority = violation.attr["priority"];
                    const line = Number.parseInt(violation.attr["lineNumber"]);
                    const sourceLine = violation.childNamed("SourceLine")?.val;
                    const message = violation.childNamed("Message")!.val;

                    errors.push({
                        priority,
                        line,
                        sourceLine,
                        message,
                        severity: SeverityLevel.Error, // all CodeNarc violations are errors
                        column: null,
                    });
                }

                if (errors.length > 0) {
                    console.log("Errors in " + packagePath + "/" + fileName, errors);
                    files.push({
                        name: fileName,
                        package: packagePath,
                        errors,
                        unresolved: true,
                    });
                }
            }
        }
    } else {
        console.log("Could not read report XML file: unknown root tag " + doc.name, xml);
    }

    return { files, sourceDirectories };
}
